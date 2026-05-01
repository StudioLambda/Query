---
name: lambda-query
description: >
  Skill for using @studiolambda/query, a lightweight isomorphic SWR-style async data
  management library. Use when writing, editing, reviewing, or testing code that uses
  createQuery, useQuery, QueryProvider, cache mutations, hydration, event subscriptions,
  or any @studiolambda/query API. Covers the core framework-agnostic library and
  React 19+ bindings (hooks and components).
metadata:
  version: '1.5.12'
  author: studiolambda
---

# @studiolambda/query

Lightweight (~1.7KB), isomorphic, framework-agnostic SWR-style async data management library with React 19+ bindings.

**Install:** `npm i @studiolambda/query`

**Import paths:**

- Core: `@studiolambda/query`
- React: `@studiolambda/query/react`

## How It Works

`createQuery()` returns a closure-scoped `Query` instance with two internal caches: **items** (resolved data + expiration) and **resolvers** (in-flight promises + AbortControllers). Fetches are deduplicated — concurrent `query(key)` calls return the same promise. Expired items return stale data immediately while revalidating in the background (SWR pattern, configurable via `stale` option). An `EventTarget` powers subscriptions, and an optional `BroadcastChannel` syncs mutations across tabs.

## Quick Start

```typescript
import { createQuery } from '@studiolambda/query'

const query = createQuery({
  fetcher: async (key, { signal }) => {
    const res = await fetch(key, { signal })
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
  },
  expiration: () => 5000,
})

const user = await query.query<User>('/api/user/1')

await query.mutate('/api/user/1', { ...user, name: 'New Name' })
await query.forget('/api/user/1')
```

## React Quick Start

```tsx
import { createQuery } from '@studiolambda/query'
import { QueryProvider } from '@studiolambda/query/react'
import { useQuery } from '@studiolambda/query/react'
import { Suspense } from 'react'

const query = createQuery({ fetcher: myFetcher })

function App() {
  return (
    <QueryProvider query={query} clearOnForget>
      <Suspense fallback={<Loading />}>
        <UserProfile />
      </Suspense>
    </QueryProvider>
  )
}

function UserProfile() {
  const { data, isPending, refetch, mutate, forget } = useQuery<User>('/api/user/1')

  return (
    <div style={{ opacity: isPending ? 0.5 : 1 }}>
      <h1>{data.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expiration` | `(item: T) => number` | `() => 2000` | Cache duration in ms |
| `fetcher` | `(key: string, { signal }) => Promise<T>` | `fetch`-based JSON | Data fetcher function |
| `stale` | `boolean` | `true` | Return stale data while revalidating |
| `removeOnError` | `boolean` | `false` | Remove cached item on fetch error |
| `fresh` | `boolean` | `false` | Always bypass cache and abort pending |

Instance-only: `itemsCache`, `resolversCache` (injectable `Cache<T>` interface), `events` (EventTarget), `broadcast` (BroadcastChannel).

## Events

Events: `refetching`, `resolved`, `mutating`, `mutated`, `aborted`, `forgotten`, `hydrated`, `error`.

Only `mutated`, `resolved`, `hydrated`, and `forgotten` are broadcast cross-tab. Errors, aborts, refetching, and mutating are local-only.

## Gotchas

- **Expiration is a function, not a number.** Always `expiration: () => 5000`, not `expiration: 5000`.
- **Mutated/hydrated items default to 0ms expiration** — immediately stale unless you pass a custom `expiration`.
- **`configure()` uses `??` internally** — you cannot reset a value to `undefined`/`null`/`false`/`0`.
- **`useQuery` suspends.** Components must be inside `<Suspense>`.
- **`data` from `useQuery` is always resolved.** Never undefined/null from loading state.
- **`forget` does not cancel pending fetches.** Use `abort` to cancel in-flight requests.
- **`fresh: true` aborts then refetches.** Ensures a genuinely new fetch.
- **`subscribe('refetching')` fires immediately** if a resolver is already in-flight for that key.
- **`refetch()` from `useQueryActions` defaults `stale: false`** — it blocks on fresh data, unlike the instance default.
- **`QueryProvider` auto-creates a `BroadcastChannel('query')`** — all providers share the same channel name.
- **Broadcast silently swallows `DataCloneError`** for non-structurally-cloneable payloads.
- **Pass stable `keys` arrays to `useQueryPrefetch` / `QueryPrefetch`.** Unstable references re-trigger prefetching.
- **React Compiler handles memoization.** Do NOT use `useMemo`, `useCallback`, or `React.memo`.

## When to Load References

- Using core API (query, mutate, forget, hydrate, abort, events, streams) -> [core-api.md](references/core-api.md)
- Using React hooks or components (useQuery, QueryProvider, transitions, prefetch) -> [react-bindings.md](references/react-bindings.md)
- Writing or reviewing tests for components using query -> [testing-patterns.md](references/testing-patterns.md)
