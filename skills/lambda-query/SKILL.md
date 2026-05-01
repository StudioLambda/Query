---
name: lambda-query
description: >
  Skill for using @studiolambda/query, a lightweight isomorphic SWR-style async data
  management library. Use when writing, editing, reviewing, or testing code that uses
  createQuery, useQuery, QueryProvider, cache mutations, hydration, event subscriptions,
  or any @studiolambda/query API. Covers the core framework-agnostic library and
  React 19+ bindings (hooks and components).
metadata:
  version: "1.5.9"
  author: studiolambda
---

# @studiolambda/query

Lightweight (~1.7KB), isomorphic, framework-agnostic SWR-style async data management library with React 19+ bindings.

**Install:** `npm i @studiolambda/query`

**Import paths:**
- Core: `@studiolambda/query`
- React: `@studiolambda/query/react`

## Core API

### Creating an instance

```typescript
import { createQuery } from '@studiolambda/query'

const query = createQuery({
  fetcher: async (key, { signal }) => {
    const res = await fetch(key, { signal })
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  },
  expiration: () => 5000,  // cache for 5 seconds
  stale: true,             // return stale data while revalidating (default)
  removeOnError: false,    // keep cached item on fetch error (default)
  fresh: false,            // respect cache (default)
})
```

### Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expiration` | `(item: T) => number` | `() => 2000` | Cache duration in ms |
| `fetcher` | `(key: string, { signal }) => Promise<T>` | `fetch`-based JSON | Data fetcher function |
| `stale` | `boolean` | `true` | Return stale data while revalidating |
| `removeOnError` | `boolean` | `false` | Remove cached item on fetch error |
| `fresh` | `boolean` | `false` | Always bypass cache |

Instance-only options: `itemsCache`, `resolversCache`, `events` (EventTarget), `broadcast` (BroadcastChannel).

### Query

```typescript
const data = await query.query<User>('/api/user/1')

// Per-query option overrides
const data = await query.query<User>('/api/user/1', {
  fetcher: customFetcher,
  stale: false,
  fresh: true,
})
```

### Mutations

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

// With custom expiration
await query.mutate('/api/user', updatedUser, { expiration: () => 10000 })
```

### Forget (invalidate cache)

```typescript
await query.forget('/api/user')                   // Single key
await query.forget(['/api/user', '/api/posts'])    // Multiple keys
await query.forget(/^\/api\/users(.*)/)            // Regex pattern
await query.forget()                               // All keys
```

**Note:** `forget` only removes items from the items cache -- it does not cancel pending resolvers. Use `abort` to cancel in-flight requests. If a cached promise has rejected, `forget` handles it gracefully (emits `'forgotten'` with `undefined`).

### Hydrate (pre-populate cache)

```typescript
query.hydrate('/api/user', serverData, { expiration: () => 10000 })
query.hydrate(['/api/post/1', '/api/post/2'], defaultPost)
```

### Abort

```typescript
query.abort('/api/user')              // Abort single key
query.abort(['/api/user', '/api/posts']) // Abort multiple
query.abort()                         // Abort all pending
query.abort('/api/user', 'cancelled') // With custom reason
```

**Note:** When `fresh: true` is used, `abort(key)` is called before `refetch(key)` to ensure a genuinely new fetch starts instead of returning the pending deduplication promise.

### Inspect cache

```typescript
const value = await query.snapshot<User>('/api/user')  // Current cached value or undefined
const itemKeys = query.keys('items')                   // readonly string[]
const resolverKeys = query.keys('resolvers')           // readonly string[]
const date = query.expiration('/api/user')              // Expiration Date or undefined
```

### Reconfigure

```typescript
query.configure({ expiration: () => 10000, stale: false })
```

### Events

Events: `refetching`, `resolved`, `mutating`, `mutated`, `aborted`, `forgotten`, `hydrated`, `error`.

```typescript
// Subscribe (returns unsubscriber)
const unsub = query.subscribe('/api/user', 'resolved', (event) => {
  console.log('resolved:', event.detail)
})
unsub()

// One-time listener (supports optional AbortSignal for cleanup)
const event = await query.once('/api/user', 'resolved')
const event = await query.once('/api/user', 'resolved', signal) // cancellable

// Await next fetch resolution (supports optional AbortSignal)
const result = await query.next<string>('/api/user')
const [a, b] = await query.next<[User, Config]>(['/api/user', '/api/config'])
const obj = await query.next<{ user: User }>({ user: '/api/user' })

// Stream resolutions (async generator -- cleans up listeners on break/return)
for await (const value of query.stream<User>('/api/user')) {
  console.log(value)
}

// Stream arbitrary events (async generator -- cleans up listeners on break/return)
for await (const event of query.sequence<User>('/api/user', 'resolved')) {
  console.log(event.detail)
}
```

### Cross-tab sync

```typescript
// Must configure broadcast manually in vanilla usage
query.configure({ broadcast: new BroadcastChannel('query') })
const unsub = query.subscribeBroadcast()
// ... later
unsub()
```

**Note:** `subscribeBroadcast()` captures the broadcast reference at call time. If `configure()` later replaces the channel, the unsubscriber still targets the original. `emit()` wraps `postMessage` in try-catch for non-cloneable data.

## React Bindings

Designed for React 19+ with first-class Suspense and Transitions support. Uses React Compiler for automatic memoization -- do NOT use `useMemo`, `useCallback`, or `React.memo`.

### Setup

```tsx
import { QueryProvider } from '@studiolambda/query/react'
import { createQuery } from '@studiolambda/query'

const query = createQuery({ fetcher: myFetcher })

function App() {
  return (
    <QueryProvider query={query} clearOnForget>
      <Suspense fallback={<Loading />}>
        <MyComponents />
      </Suspense>
    </QueryProvider>
  )
}
```

`QueryProvider` props:
- `query?` - Query instance (creates one if omitted)
- `clearOnForget?` - Auto-refetch after `forget()` (default `false`)
- `ignoreTransitionContext?` - Use local transitions instead of shared (default `false`)

`QueryProvider` automatically handles BroadcastChannel setup, cleanup, and cross-tab event forwarding. Includes a guard for environments where `BroadcastChannel` is unavailable.

### useQuery

The primary hook. Components using it **must** be inside `<Suspense>`.

```tsx
import { useQuery } from '@studiolambda/query/react'

function UserProfile() {
  const { data, isPending, isRefetching, refetch, mutate, forget } = useQuery<User>('/api/user/1')

  return (
    <div style={{ opacity: isPending ? 0.5 : 1 }}>
      <h1>{data.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
      <button onClick={() => mutate({ ...data, name: 'New Name' })}>Update</button>
      <button onClick={() => forget()}>Clear</button>
    </div>
  )
}
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T` | Resolved data (always available, Suspense handles loading) |
| `isPending` | `boolean` | Transition pending for mutations/refetches |
| `expiresAt` | `Date` | When cached data expires |
| `isExpired` | `boolean` | Whether data is stale |
| `isRefetching` | `boolean` | Background refetch in progress |
| `isMutating` | `boolean` | Mutation in progress (async mutations only) |
| `refetch` | `(options?) => Promise<T>` | Trigger fresh fetch |
| `mutate` | `(value, options?) => Promise<T>` | Optimistic mutation |
| `forget` | `() => Promise<void>` | Clear cached data |

**Options (second argument):** All core `Options` fields plus `query?`, `clearOnForget?`, `ignoreTransitionContext?`.

### useQueryActions

Actions without data subscription. Use when you need to mutate/refetch from a sibling component.

```tsx
const { refetch, mutate, forget } = useQueryActions<User>('/api/user/1')
```

### useQueryStatus

Status without data subscription.

```tsx
const { expiresAt, isExpired, isRefetching, isMutating } = useQueryStatus('/api/user/1')
```

### useQueryBasic

Minimal hook returning only `data` and `isPending`. Correctly resets data when the key changes to a different cached value.

```tsx
const { data, isPending } = useQueryBasic<User>('/api/user/1')
```

### useQueryInstance

Get the raw `Query` instance from context. Throws if none found.

```tsx
const queryInstance = useQueryInstance()
```

### useQueryPrefetch

Prefetch keys on mount.

```tsx
import { useMemo } from 'react'

const keys = useMemo(() => ['/api/user/1', '/api/config'], [])
useQueryPrefetch(keys)
```

### QueryTransition

Share a single transition across multiple `useQuery` calls:

```tsx
import { QueryTransition } from '@studiolambda/query/react'
import { useTransition } from 'react'

function App() {
  const [isPending, startTransition] = useTransition()
  return (
    <QueryTransition isPending={isPending} startTransition={startTransition}>
      <UserList />
      <UserDetails />
    </QueryTransition>
  )
}
```

### QueryPrefetch / QueryPrefetchTags

```tsx
import { useMemo } from 'react'

const keys = useMemo(() => ['/api/user', '/api/config'], [])

<QueryPrefetch keys={keys}>
  <Content />
</QueryPrefetch>

// Also renders <link rel="preload" as="fetch"> tags
<QueryPrefetchTags keys={keys}>
  <Content />
</QueryPrefetchTags>
```

### Testing React components

```tsx
import { createQuery } from '@studiolambda/query'
import { useQuery } from '@studiolambda/query/react'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

it('renders user data', async ({ expect }) => {
  const query = createQuery({ fetcher: () => Promise.resolve({ name: 'Ada' }) })
  const promise = query.next<User>('/api/user')

  function Component() {
    const { data } = useQuery<User>('/api/user', { query })
    return <span>{data.name}</span>
  }

  const el = document.createElement('div')

  await act(async () => {
    createRoot(el).render(
      <Suspense fallback="loading"><Component /></Suspense>
    )
  })

  await act(async () => { await promise })
  expect(el.innerText).toBe('Ada')
})
```

Pattern: create query with mock fetcher, pass it via `{ query }` option to bypass context, use `query.next(key)` to await resolution.

## Gotchas

- **Expiration is a function, not a number.** Always `expiration: () => 5000`, not `expiration: 5000`.
- **`useQuery` suspends.** Components must be inside `<Suspense>` or React throws.
- **`data` from `useQuery` is always resolved.** Never undefined/null from loading state. Suspense handles loading.
- **`hydrate` without expiration creates immediately-stale data.** The first `query()` returns the hydrated value, the second triggers a refetch.
- **Mutation with `expiration: () => 0` makes the value immediately stale.** Provide a non-zero expiration if you want it to persist.
- **`forget` does not cancel pending fetches.** Only removes items from the items cache. Use `abort` to cancel in-flight requests.
- **`stale: false` blocks until refetch completes.** Default `stale: true` returns old data while revalidating in the background.
- **`subscribe('refetching')` on a key with a pending resolver fires immediately.** Intentional for late subscribers.
- **BroadcastChannel is not auto-created in vanilla usage.** `QueryProvider` handles it in React. In core, configure it manually.
- **Pass stable `keys` arrays to `useQueryPrefetch` / `QueryPrefetch`.** Use `useMemo` or a module-level constant to avoid infinite re-renders.
- **`useQueryInstance` throws if no query is in context or options.** Ensure `QueryProvider` is an ancestor or pass `{ query }` in options.
- **React Compiler handles memoization.** Do NOT use `useMemo`, `useCallback`, or `React.memo` -- the compiler does it automatically.
- **`once()` and `next()` accept an optional `AbortSignal`.** Use to cancel pending listeners when breaking out of generators.
- **`stream()` and `sequence()` clean up on break.** Internal `AbortController` cancels pending listeners via `finally` block.
- **Abort race condition is handled.** If `abort()` fires after fetch resolves but before cache write, the result is discarded and the promise rejects.
- **`next()` supports object keys.** `await query.next<{ user: User }>({ user: '/api/user' })` returns an object with the same shape.
- **`fresh: true` aborts then refetches.** Ensures a genuinely new fetch instead of returning the pending deduplication promise.
