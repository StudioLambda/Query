---
name: lambda-query
description: >
  Skill for using @studiolambda/query, a lightweight isomorphic SWR-style async data
  management library. Use when writing, editing, reviewing, or testing code that uses
  createQuery, useQuery, QueryProvider, cache mutations, hydration, event subscriptions,
  or any @studiolambda/query API. Covers the core framework-agnostic library and
  React 19.2+ bindings (hooks and components).
metadata:
  author: studiolambda
---

# @studiolambda/query

Isomorphic, framework-agnostic SWR-style async data management library with React 19.2+ bindings.

**Install:** `npm i @studiolambda/query`

**Import paths:**

- Core: `@studiolambda/query`
- React: `@studiolambda/query/react`

## How It Works

`createQuery()` owns **items** (data promises + expiration), **resolvers** (in-flight fetches + AbortControllers), and fresh render-resource lifetimes. Ordinary fetches deduplicate per key; expired data can be returned while revalidating (`stale: true`). Only the current request owner may publish cache writes and completion events. Same-key mutations commit in call order. An `EventTarget` powers subscriptions; cross-tab event delivery requires an explicitly configured, caller-owned `BroadcastChannel`.

For repository changes, read the implementation and regression tests for the affected path before editing. Check `package.json` for current commands and versions. Use the references below for API behavior and migration caveats rather than assuming that an action named `refetch` forces a network request.

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
      <button onClick={() => refetch({ fresh: true })}>Refresh</button>
    </div>
  )
}
```

## Configuration Options

| Option          | Type                                      | Default            | Description                           |
| --------------- | ----------------------------------------- | ------------------ | ------------------------------------- |
| `expiration`    | `(item: T) => number`                     | `() => 2000`       | Cache duration in ms                  |
| `fetcher`       | `(key: string, { signal }) => Promise<T>` | `fetch`-based JSON | Data fetcher function                 |
| `stale`         | `boolean`                                 | `true`             | Return stale data while revalidating  |
| `removeOnError` | `boolean`                                 | `false`            | Remove cached item on fetch error     |
| `fresh`         | `boolean`                                 | `false`            | Always bypass cache and abort pending |

Instance-only: `itemsCache`, `resolversCache` (injectable `Cache<T>` interface), `events` (EventTarget), `broadcast` (BroadcastChannel). `fresh` forces each imperative `query()` call; React uses `Query.resource()` to share a fresh request across Suspense retries and committed same-key consumers.

## Events

Events: `refetching`, `resolved`, `mutating`, `mutated`, `aborted`, `forgotten`, `hydrated`, `error`.

Only `mutated`, `resolved`, `hydrated`, and `forgotten` are broadcast cross-tab. Errors, aborts, refetching, and mutating are local-only.

## Gotchas

- **Expiration is a function, not a number.** Always `expiration: () => 5000`, not `expiration: 5000`.
- **Mutated/hydrated items default to 0ms expiration** — immediately stale unless you pass a custom `expiration`.
- **`configure()` uses `??` internally** — nullish values keep the previous setting. `false` and expiration functions returning `0` are valid overrides.
- **`useQuery` suspends.** Components must be inside `<Suspense>`.
- **`data` from `useQuery` is resolved.** Suspense handles loading, but a fetcher may itself resolve `null` or `undefined`.
- **`forget` does not cancel pending fetches.** Use `abort` to cancel in-flight requests.
- **Imperative `query(..., { fresh: true })` aborts then refetches.** React resource reads instead share a fresh consumer lifetime.
- **`subscribe(key, 'refetching', listener)` queues notification in a microtask** if a resolver is already in-flight for that key.
- **`refetch()` defaults `stale: false`, not `fresh: true`.** Unexpired cached data is reused; use `refetch({ fresh: true })` to force a request.
- **Cross-tab sync is opt-in.** Scope caller-created channel names to the application, tenant, and session. Providers subscribe but never create or close channels.
- **Failed background refetches preserve rendered stale data.** Observe the instance `error` event; blocking initial reads and explicit action promises still reject.
- **Same-key mutation resolvers run serially.** A rejection preserves the last committed item and does not poison later mutations. Never await another same-key mutation inside its resolver: it queues behind itself.
- **Mutation/hydration commits supersede older fetches.** Those callers still settle, but obsolete fetches cannot overwrite local data or emit completion errors; later revalidation need not wait for them.
- **Broadcast silently swallows `DataCloneError`** for non-structurally-cloneable payloads.
- **Pass stable `keys` arrays to `useQueryPrefetch` / `QueryPrefetch`.** Unstable references re-trigger prefetching.
- **React Compiler handles memoization.** Do NOT use `useMemo`, `useCallback`, or `React.memo`.

## When to Load References

- Using core API (query, mutate, forget, hydrate, abort, events, streams) -> [core-api.md](references/core-api.md)
- Using React hooks or components (useQuery, QueryProvider, transitions, prefetch) -> [react-bindings.md](references/react-bindings.md)
- Writing or reviewing tests for components using query -> [testing-patterns.md](references/testing-patterns.md)
