# Core API Reference

## Table of Contents

- [createQuery](#createquery)
- [query](#query)
- [Render Resources](#render-resources)
- [Mutations](#mutations)
- [Forget (Cache Invalidation)](#forget-cache-invalidation)
- [Hydrate (Pre-populate Cache)](#hydrate-pre-populate-cache)
- [Abort](#abort)
- [Cache Inspection](#cache-inspection)
- [Reconfigure](#reconfigure)
- [Events and Subscriptions](#events-and-subscriptions)
- [Cross-tab Sync](#cross-tab-sync)
- [Types](#types)

---

## createQuery

```typescript
function createQuery(options?: Configuration): Query
```

Factory that returns a closure-scoped `Query` instance. Defaults are isolated; injected caches, events, and channels remain caller-owned. Low-level accessors `caches()`, `events()`, and `broadcast()` expose the configured objects.

```typescript
import { createQuery } from '@studiolambda/query'

const query = createQuery({
  fetcher: async (key, { signal }) => {
    const res = await fetch(key, { signal })
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  },
  expiration: () => 5000,
  stale: true,
  removeOnError: false,
  fresh: false,
})
```

**Default fetcher** (`defaultFetcher`): Uses global `fetch`, parses JSON, throws `new Error('Unable to fetch the data: ' + statusText)` on non-ok responses.

---

## query

```typescript
function query<T>(key: string, options?: Options<T>): Promise<T>
```

Core fetch method with deduplication, caching, and SWR behavior.

**Resolution order:**

1. **`fresh: true`**: Calls `abort(key)` first, starts a completely new fetch — bypasses dedup and cache.
2. **Cache hit + not expired**: Returns cached promise, even if a fetch is pending.
3. **Cache hit + expired + `stale: true`**: Returns stale data immediately, starts or joins revalidation. Background rejection is caught; the owning request still emits `error`.
4. **Cache hit + expired + `stale: false`**, or **cache miss**: Returns the active fetch promise or starts a fetch. A fetch superseded by a committed local write is not reused.

**Post-abort guard**: If `AbortController.signal.aborted` is true after fetch resolves, the result is rejected (not written to cache).

**Ownership guard**: Only the request whose controller still owns the resolver slot can change shared caches or emit completion events. Late success/failure from an aborted or replaced request cannot remove its replacement's resolver or data. An aborted request that resolves rejects with its abort reason; other obsolete callers retain their own fetch result/error.

**On current-request error**: Deletes its resolver. If `removeOnError: true`, also deletes its cached item. Emits `error` and rejects the caller promise. A fetch superseded by mutation/hydration performs no cache write, removal, or completion event, even if it fails.

```typescript
// Basic
const data = await query.query<User>('/api/user/1')

// Per-query overrides
const data = await query.query<User>('/api/user/1', {
  fetcher: customFetcher,
  stale: false,
  fresh: true,
})
```

---

## Render Resources

```typescript
import { createQuery, type QueryResource } from '@studiolambda/query'

const client = createQuery({ fetcher: async () => 'ready' })
const request: QueryResource<string> = client.resource('status', { fresh: true })
const release = request.retain()
try {
  console.log(await request.promise)
} catch (error) {
  console.error(error)
} finally {
  release()
}
```

`resource<T>(key, options?)` returns `{ promise: Promise<T>, retain: () => Unsubscriber }`. This is the framework-neutral lifecycle API used by React; ordinary imperative callers should use `query()`.

- Non-fresh reads delegate to `query()`; retention and cleanup are no-ops.
- Fresh reads select one instance-owned request per key. Suspense retries and sibling consumers share it, including after expiration; the first reader selects request options for that lifetime.
- Call `retain()` for each committed consumer and call its returned release function exactly once on cleanup. The final release evicts the selection on the next microtask, so synchronous StrictMode reconnection reuses it. A later mount starts fresh again.
- An abandoned initial render has no committed cleanup. Its selection remains reusable until `forget`, request/cache reconfiguration, or instance garbage collection. Avoid process-global instances for request-scoped server data.
- A rejected initial fresh selection is also retained: resetting an error boundary alone reuses that rejection. Invalidate with `forget(key)` before retrying, or explicitly start a replacement request. Recheck `resource()` and its regression tests when changing retry behavior.
- Successful fetches, mutations, and hydration keep the selected promise aligned with committed data. Explicit `query(..., { fresh: true })` still forces a request; retained readers keep successful data until a replacement succeeds.
- `forget` invalidates matching fresh selections, including pending selections without cached items, but does not abort their transports. Request/cache `configure` changes invalidate selections; notification-only `events`/`broadcast` changes preserve them.

Source checks: `src/query/query.ts`, `src/query/options.ts`, `src/query/resource.test.ts`, and `src/react/hooks/useQueryFresh.test.tsx`.

---

## Mutations

```typescript
function mutate<T>(
  key: string,
  resolver: MutationValue<T>,
  options?: MutateOptions<T>,
): Promise<T>
```

`resolver` can be:
- A direct value `T`
- A sync function `(previous?: T, expiresAt?: Date) => T`
- An async function `(previous?: T, expiresAt?: Date) => Promise<T>`

Emits `'mutating'` with the **unresolved promise**, then `'mutated'` with the resolved value.

Mutations on the same key execute and commit in call order, including direct values. Functional resolvers read the previous committed value and expiration after their queue turn begins. Different keys proceed independently. Resolver/expiration failures reject only that mutation, preserve committed data, and allow the next queued mutation to run; mutation failures do not emit the fetch `error` event.

A resolver must not await another `mutate()` on its own key: the nested mutation waits for that resolver to finish. Compose the change in one resolver or await the second mutation outside it.

Successful mutation/hydration commits supersede any older pending fetch. Its existing caller can still settle, but it cannot overwrite the local commit, emit `resolved`/`error`, or delete newer data on failure. Subsequent revalidation can start without waiting for it.

**Important**: Mutated items default to `0ms` expiration — they're immediately stale unless you provide a custom `expiration`.

```typescript
// Direct value
await query.mutate('/api/user', updatedUser)

// Function based on previous value
await query.mutate<Post[]>('/api/posts', (previous) => [...(previous ?? []), newPost])

// Async mutation
await query.mutate('/api/posts', async (previous) => {
  const post = await createNewPost()
  return [...(previous ?? []), post]
})

// With custom expiration (persists in cache)
await query.mutate('/api/user', updatedUser, { expiration: () => 10000 })

// Immediately stale (triggers refetch on next query)
await query.mutate('/api/user', updatedUser, { expiration: () => 0 })
```

---

## Forget (Cache Invalidation)

```typescript
function forget(keys?: string | readonly string[] | RegExp): Promise<void>
```

Removes items and matching fresh resource selections — does **not** cancel pending resolvers.

- **String**: Forget single key.
- **Array**: Forget multiple keys.
- **RegExp**: Pattern-based clearing (e.g., `/^\/api\/users(.*)/`).
- **No arguments**: Clear entire items cache.

Handles rejected cached promises gracefully — emits `'forgotten'` with `undefined` for those keys and continues processing remaining keys.

```typescript
await query.forget('/api/user')                   // Single key
await query.forget(['/api/user', '/api/posts'])    // Multiple keys
await query.forget(/^\/api\/users(.*)/)            // Regex pattern
await query.forget()                               // All keys
```

---

## Hydrate (Pre-populate Cache)

```typescript
function hydrate<T>(
  keys: string | readonly string[],
  item: T,
  options?: HydrateOptions<T>,
): void
```

Synchronous. Wraps `item` in `Promise.resolve()` and stores in cache.

**Important**: Like `mutate`, defaults to `0ms` expiration — immediately stale unless custom `expiration` provided. The first ordinary `query()` can already start revalidation while returning hydrated data under the default `stale: true` policy.

```typescript
query.hydrate('/api/user', serverData, { expiration: () => 10000 })
query.hydrate(['/api/post/1', '/api/post/2'], defaultPost)
```

---

## Abort

```typescript
function abort(keys?: string | readonly string[], reason?: unknown): void
```

Calls `controller.abort(reason)` on in-flight fetches and removes them from `resolversCache`.

```typescript
query.abort('/api/user')                       // Single key
query.abort(['/api/user', '/api/posts'])        // Multiple keys
query.abort()                                   // All pending
query.abort('/api/user', 'cancelled')           // Custom reason
```

---

## Cache Inspection

```typescript
// Current cached value or undefined (does NOT trigger a fetch)
const value = await query.snapshot<User>('/api/user')

// Cache keys
const itemKeys = query.keys('items')         // readonly string[]
const resolverKeys = query.keys('resolvers') // readonly string[]

// Expiration date for a cached item
const date = query.expiration('/api/user')   // Date | undefined
```

---

## Reconfigure

```typescript
function configure(options?: Configuration): void
```

Merges options into existing instance state using `??` (nullish coalescing).

Nullish settings keep the previous value. Boolean `false` is accepted, as are expiration functions returning `0`; `expiration` itself must be a function, not a number. Request/cache settings invalidate fresh resource selections, while notification-only settings preserve them. Replacing a channel does not close it or move existing subscriptions: unsubscribe and subscribe again explicitly.

```typescript
query.configure({ expiration: () => 10000, stale: false })
```

---

## Events and Subscriptions

### Event Types

| Event | Detail | Broadcast | Description |
|-------|--------|-----------|-------------|
| `refetching` | `Promise<T>` | No | Fetch started |
| `resolved` | `T` | Yes | Fetch completed |
| `mutating` | `Promise<T>` | No | Mutation started |
| `mutated` | `T` | Yes | Mutation completed |
| `aborted` | `unknown` (reason) | No | Fetch cancelled |
| `forgotten` | `T \| undefined` | Yes | Cache cleared |
| `hydrated` | `T` | Yes | Cache pre-populated |
| `error` | `unknown` | No | Fetch error |

### subscribe

```typescript
function subscribe<T>(
  key: string,
  event: QueryEvent,
  listener: (event: CustomEventInit<T>) => void,
): Unsubscriber
```

Returns an unsubscribe function. If subscribing to `'refetching'` and a resolver already exists, queues a microtask notification using that pending promise. This is not synchronous delivery.

```typescript
const unsub = query.subscribe('/api/user', 'resolved', (event) => {
  console.log('resolved:', event.detail)
})
unsub()
```

### once

```typescript
function once<T>(
  key: string,
  event: QueryEvent,
  signal?: AbortSignal,
): Promise<CustomEventInit<T>>
```

Resolves on first event, auto-unsubscribes. Supports `AbortSignal` for cancellation (rejects with `signal.reason`). Handles already-aborted signals.

```typescript
const event = await query.once('/api/user', 'resolved')
const event = await query.once('/api/user', 'resolved', signal) // cancellable
```

### next

```typescript
function next<T>(key: string, signal?: AbortSignal): Promise<T>
function next<T>(keys: readonly string[], signal?: AbortSignal): Promise<T>
function next<T>(keys: { [K in keyof T]: string }, signal?: AbortSignal): Promise<T>
```

Waits for the next `'refetching'` event and **awaits the detail promise**. Three shapes:

```typescript
// Single key
const result = await query.next<string>('/api/user')

// Array of keys (returns array)
const [a, b] = await query.next<[User, Config]>(['/api/user', '/api/config'])

// Object of keys (returns object with same shape)
const obj = await query.next<{ user: User }>({ user: '/api/user' })
```

### stream (async generator)

```typescript
function stream<T>(keys: string | readonly string[] | Record<string, string>): AsyncGenerator<T>
```

Infinite async generator yielding `next()` results. Its `finally` block aborts internal listeners when the generator exits. Calling `.return()` queues behind a pending `.next()`; it does not interrupt that pending event wait. For externally cancellable waits, use `next(keys, signal)` directly.

```typescript
for await (const value of query.stream<User>('/api/user')) {
  console.log(value)
}
```

### sequence (async generator)

```typescript
function sequence<T>(key: string, event: QueryEvent): AsyncGenerator<CustomEventInit<T>>
```

Like `stream` but for arbitrary events on a single key via `once()`. Cleanup runs when the generator exits; `.return()` cannot interrupt a pending event wait. Use `once(key, event, signal)` for externally cancellable waits.

```typescript
for await (const event of query.sequence<User>('/api/user', 'resolved')) {
  console.log(event.detail)
}
```

---

## Cross-tab Sync

```typescript
function subscribeBroadcast(): Unsubscriber
```

Listens on the explicitly configured `BroadcastChannel` and replays accepted events into the local `EventTarget`. Captures the channel reference at call time, so cleanup still removes the original listener after `configure()` replacement. Replay is event delivery, not a write into the receiving instance's item cache, and is not rebroadcast.

Broadcast silently catches `DataCloneError` for non-structurally-cloneable payloads.

```typescript
// Browser-only setup; choose a non-secret scope for this app/tenant/session.
const channel = new BroadcastChannel('orders:tenant-42:session-7')
query.configure({ broadcast: channel })
const unsub = query.subscribeBroadcast()
// ... later
unsub()
channel.close() // Caller owns it; close only after every user has detached.
```

`QueryProvider` subscribes to an already configured channel and shares one incoming listener between providers using the same query. It creates no channel and never closes one. In SSR or runtimes without `BroadcastChannel`, omit this setup.

Migration: replace reliance on the old implicit global `'query'` channel with an explicitly scoped channel on the supplied query. Channel names are routing labels that prevent accidental cross-talk, not security boundaries or authentication: other same-origin participants knowing the name can send and receive data. Send only cloneable data appropriate for those participants.

---

## Types

```typescript
type QueryEvent =
  | 'refetching' | 'resolved' | 'mutating' | 'mutated'
  | 'aborted' | 'forgotten' | 'hydrated' | 'error'

type FetcherFunction<T> = (key: string, additional: FetcherAdditional) => Promise<T>

interface FetcherAdditional {
  readonly signal: AbortSignal
}

type ExpirationOptionFunction<T> = (item: T) => number

type MutationFunction<T> = (previous?: T, expiresAt?: Date) => T | Promise<T>
type MutationValue<T> = T | MutationFunction<T>

type SubscribeListener<T> = (event: CustomEventInit<T>) => void
type Unsubscriber = () => void

interface Options<T = unknown> {
  readonly expiration?: ExpirationOptionFunction<T>
  readonly fetcher?: FetcherFunction<T>
  readonly stale?: boolean
  readonly removeOnError?: boolean
  readonly fresh?: boolean
}

interface Configuration extends Options {
  readonly itemsCache?: Cache<ItemsCacheItem>
  readonly resolversCache?: Cache<ResolversCacheItem>
  readonly events?: EventTarget
  readonly broadcast?: BroadcastChannel
}

interface HydrateOptions<T = unknown> {
  readonly expiration?: ExpirationOptionFunction<T>
}

interface MutateOptions<T = unknown> {
  readonly expiration?: ExpirationOptionFunction<T>
}

// Cache is injectable — any backing store implementing this interface works
interface Cache<T> {
  get(key: string): T | undefined
  set(key: string, value: T): void
  delete(key: string): void
  keys(): IterableIterator<string>
}

interface ItemsCacheItem<T> {
  item: Promise<T>
  expiresAt: Date
}

interface ResolversCacheItem<T> {
  item: Promise<T>
  controller: AbortController
}

type CacheType = 'resolvers' | 'items'

interface BroadcastPayload {
  event: `${QueryEvent}:${string}`
  detail: unknown
}
```
