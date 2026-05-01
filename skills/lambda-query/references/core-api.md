# Core API Reference

## Table of Contents

- [createQuery](#createquery)
- [query](#query)
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

Factory that returns a closure-scoped `Query` instance. All state (caches, EventTarget, BroadcastChannel) is private.

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
2. **Resolver exists** (in-flight fetch for same key): Returns the existing promise (deduplication).
3. **Cache hit + not expired**: Returns cached promise, no fetch.
4. **Cache hit + expired + `stale: true`**: Returns stale data immediately, triggers background revalidation (errors silenced).
5. **Cache hit + expired + `stale: false`**: Blocks until revalidation completes.
6. **Cache miss**: Fetches and caches.

**Post-abort guard**: If `AbortController.signal.aborted` is true after fetch resolves, the result is rejected (not written to cache).

**On error**: Deletes resolver from `resolversCache`. If `removeOnError: true`, also deletes from `itemsCache`. Emits `'error'` event.

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

Removes items from the items cache only — does **not** cancel pending resolvers.

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

**Important**: Like `mutate`, defaults to `0ms` expiration — immediately stale unless custom `expiration` provided. This means the first `query()` returns hydrated data, the second triggers a refetch.

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

**Caveat**: You **cannot** reset a value to `undefined`, `null`, `false`, or `0` — those fall through to the previous value.

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

Returns an unsubscribe function. If subscribing to `'refetching'` and a resolver already exists, **immediately fires** the event to the new listener.

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

Infinite async generator yielding `next()` results. Internal `AbortController` cancels pending listeners on `break`/`return` via `finally` block.

```typescript
for await (const value of query.stream<User>('/api/user')) {
  console.log(value)
}
```

### sequence (async generator)

```typescript
function sequence<T>(key: string, event: QueryEvent): AsyncGenerator<CustomEventInit<T>>
```

Like `stream` but for arbitrary events on a single key via `once()`. Cleans up on `break`/`return`.

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

Listens on the `BroadcastChannel` and replays received events into the local `EventTarget`. Captures the broadcast reference at call time — safe against later `configure()` replacement.

Broadcast silently catches `DataCloneError` for non-structurally-cloneable payloads.

```typescript
// Vanilla usage (React's QueryProvider handles this automatically)
query.configure({ broadcast: new BroadcastChannel('query') })
const unsub = query.subscribeBroadcast()
// ... later
unsub()
```

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

interface Configuration<T = unknown> extends Options<T> {
  readonly itemsCache?: Cache<ItemsCacheItem<T>>
  readonly resolversCache?: Cache<ResolversCacheItem<T>>
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
