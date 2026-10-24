# React Bindings Reference

Requires React 19.2+ (including `useEffectEvent`) with first-class Suspense and Transitions support. Uses React Compiler for automatic memoization — do NOT use `useMemo`, `useCallback`, or `React.memo`.

## Table of Contents

- [Components](#components)
  - [QueryProvider](#queryprovider)
  - [QueryTransition](#querytransition)
  - [QueryPrefetch](#queryprefetch)
  - [QueryPrefetchTags](#queryprefetchtags)
- [Hooks](#hooks)
  - [useQuery](#usequery)
  - [useQueryBasic](#usequerybasic)
  - [useQueryActions](#usequeryactions)
  - [useQueryStatus](#usequerystatus)
  - [useQueryInstance](#usequeryinstance)
  - [useQueryPrefetch](#usequeryprefetch)
  - [useQueryContext](#usequerycontext)
  - [useQueryTransitionContext](#usequerytransitioncontext)
- [Types](#types)

---

## Components

### QueryProvider

```tsx
function QueryProvider({
  children,
  query,
  clearOnForget,
  ignoreTransitionContext,
}: QueryProviderProps): JSX.Element
```

| Prop                      | Type        | Default         | Description                                |
| ------------------------- | ----------- | --------------- | ------------------------------------------ |
| `query`                   | `Query`     | `createQuery()` | Query instance (creates one if omitted)    |
| `clearOnForget`           | `boolean`   | `false`         | Auto-refetch after `forget()` clears a key |
| `ignoreTransitionContext` | `boolean`   | `false`         | Use local transitions instead of shared    |
| `children`                | `ReactNode` | —               | Child components                           |

**Behavior:**

- Cross-tab sync is disabled unless the supplied query already has a channel.
- Subscribes through `query.subscribeBroadcast()` in an effect; providers sharing a query share one incoming listener.
- The final provider cleanup removes the listener, never closes the caller's channel.
- For browser setup and isolation/migration rules, read [Cross-tab Sync](core-api.md#cross-tab-sync).

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

---

### QueryTransition

```tsx
function QueryTransition({
  isPending,
  startTransition,
  children,
}: QueryTransitionProps): JSX.Element
```

Shares a single `useTransition` across multiple `useQuery` calls so they coordinate updates together.

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

Without this, each `useQuery` creates its own local `useTransition`.

---

### QueryPrefetch

```tsx
function QueryPrefetch({ keys, query, children }: QueryPrefetchProps): ReactNode
```

Fires `query(key)` for each key on mount via `useQueryPrefetch`. Renders children passthrough (no extra DOM).

```tsx
<QueryPrefetch keys={['/api/user', '/api/config']}>
  <Content />
</QueryPrefetch>
```

**Important**: Pass a stable `keys` reference. Unstable arrays re-trigger prefetching on every render.

---

### QueryPrefetchTags

```tsx
function QueryPrefetchTags({
  keys,
  query,
  children,
  ...linkProps
}: QueryPrefetchTagsProps): JSX.Element
```

Same as `QueryPrefetch` plus renders `<link rel="preload" href={key} as="fetch" {...linkProps} />` for each key. Extra `linkProps` (any `LinkHTMLAttributes`) are spread onto each `<link>`.

```tsx
<QueryPrefetchTags keys={['/api/user', '/api/config']}>
  <Content />
</QueryPrefetchTags>
```

---

## Hooks

All hooks require a `<QueryProvider>` ancestor (or a `query` option) unless noted otherwise.

### useQuery

```tsx
function useQuery<T = unknown>(key: string, options?: ResourceOptions<T>): Resource<T>
```

The primary hook. Components using it **must** be inside `<Suspense>`. Composes `useQueryBasic` + `useQueryActions` + `useQueryStatus`.

**Options** (`ResourceOptions<T>`):

All core `Options<T>` fields (`expiration`, `fetcher`, `stale`, `removeOnError`, `fresh`) plus:

| Option                    | Type      | Default      | Description               |
| ------------------------- | --------- | ------------ | ------------------------- |
| `query`                   | `Query`   | from context | Override query instance   |
| `clearOnForget`           | `boolean` | from context | Auto-refetch after forget |
| `ignoreTransitionContext` | `boolean` | from context | Use local transition      |

**Returns** (`Resource<T>`):

| Property       | Type                                                                  | Description                                                    |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `data`         | `T`                                                                   | Resolved data (always available — Suspense handles loading)    |
| `isPending`    | `boolean`                                                             | Transition pending for mutations/refetches                     |
| `expiresAt`    | `Date`                                                                | When cached data expires                                       |
| `isExpired`    | `boolean`                                                             | Whether data is stale (auto-updates via `setTimeout`)          |
| `isRefetching` | `boolean`                                                             | Background refetch in progress                                 |
| `isMutating`   | `boolean`                                                             | Async mutation in progress                                     |
| `refetch`      | `(options?: Options<T>) => Promise<T>`                                | Query with `stale: false`; pass `fresh: true` to force a fetch |
| `mutate`       | `(value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>` | Optimistic mutation                                            |
| `forget`       | `() => Promise<void>`                                                 | Clear cached data for this key                                 |

```tsx
function UserProfile() {
  const { data, isPending, isRefetching, refetch, mutate, forget } = useQuery<User>('/api/user/1')

  return (
    <div style={{ opacity: isPending ? 0.5 : 1 }}>
      <h1>{data.name}</h1>
      <button onClick={() => refetch({ fresh: true })}>Refresh</button>
      <button onClick={() => mutate({ ...data, name: 'New Name' })}>Update</button>
      <button onClick={() => forget()}>Clear</button>
    </div>
  )
}
```

---

### useQueryBasic

```tsx
function useQueryBasic<T = unknown>(
  key: string,
  options?: BasicResourceOptions<T>
): BasicResource<T>
```

Minimal hook returning only `data` and `isPending`.

**Returns:** `{ data: T, isPending: boolean }`

**Implementation details:**

1. Calls `resource<T>(key, opts)` on the query instance, then `use(promise)` (React 19) to suspend. An effect retains the committed resource and returns its release function.
2. Subscribes to 6 events: `resolved`, `mutating`, `mutated`, `hydrated`, `refetching`, `forgotten`.
3. All data updates wrapped in `startTransition` (shared or local based on `ignoreTransitionContext`).
4. If `clearOnForget` is true, selects a new resource on `forgotten`. This starts or joins a fetch according to the request policy.
5. Has a sync `data !== resolved` identity check — reference equality matters. New objects with same shape will re-set state.
6. Uses `useEffectEvent` for stable event handler references.

```tsx
const { data, isPending } = useQueryBasic<User>('/api/user/1')
```

**Fresh lifecycle:** `fresh: true` (per hook or instance default) selects one fresh request for the key's shared consumer lifetime, not one per render. Suspense retries and siblings share it even after expiration. Final consumer cleanup releases the selection on the next microtask; later mounts fetch fresh again. Initial abandoned reads remain selected until explicit invalidation or instance disposal. See [Render Resources](core-api.md#render-resources) before changing this lifecycle.

**Error boundaries:** Failed or aborted `refetching` observer promises leave the last rendered value in place; observe the core `error` event for owning fetch failures. Initial blocking reads still reject into an error boundary. Action promises retain rejection behavior and should be awaited/caught by the caller. This preservation applies to background fetch observers, not every mutation or `clearOnForget` transition failure.

---

### useQueryActions

```tsx
function useQueryActions<T = unknown>(
  key: string,
  options?: QueryActionsOptions<T>
): QueryActions<T>
```

Actions without data subscription. Does NOT re-render on data changes. Use for mutating/refetching from sibling components.

**Returns:**

| Method    | Signature                                           | Notes                                                            |
| --------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `refetch` | `(options?: Options<T>) => Promise<T>`              | Defaults `stale: false`; blocks on revalidation only when needed |
| `mutate`  | `(value: MutationValue<T>, options?) => Promise<T>` | Delegates to `query.mutate(key, ...)`                            |
| `forget`  | `() => Promise<void>`                               | Delegates to `query.forget(key)`                                 |

**Important**: `refetch()` defaults `stale` to `false`, overriding the instance default of `true` unless hook options override it. It reuses unexpired data and deduplicates eligible pending fetches. Use `refetch({ fresh: true })` to bypass the cache and abort pending work. Options passed to the action override hook options.

```tsx
const { refetch, mutate, forget } = useQueryActions<User>('/api/user/1')
```

---

### useQueryStatus

```tsx
function useQueryStatus(key: string, options?: QueryInstance): Status
```

Status without data subscription.

**Returns:**

| Property       | Type      | Description                                                   |
| -------------- | --------- | ------------------------------------------------------------- |
| `expiresAt`    | `Date`    | Expiration time (initialized from cache or `new Date()`)      |
| `isExpired`    | `boolean` | Auto-flips to `true` via `setTimeout` when expiration arrives |
| `isRefetching` | `boolean` | Set on `refetching`, cleared on `resolved`/`error`            |
| `isMutating`   | `boolean` | Set on `mutating`, cleared on `mutated`/`error`               |

Subscribes to 7 events: `mutating`, `mutated`, `hydrated`, `resolved`, `forgotten`, `refetching`, `error`.

```tsx
const { expiresAt, isExpired, isRefetching, isMutating } = useQueryStatus('/api/user/1')
```

---

### useQueryInstance

```tsx
function useQueryInstance(options?: QueryInstance): Query
```

Get the raw `Query` instance. Prefers `options.query` over context. Throws `ErrNoQueryInstanceFound` if neither available.

```tsx
const queryInstance = useQueryInstance()
```

---

### useQueryPrefetch

```tsx
function useQueryPrefetch(keys: readonly string[], options?: QueryInstance): void
```

Fires `query(key)` for each key in `useEffect`. Effect deps: `[query, keys]`.

**Important**: Since `keys` is in the dep array, new array references re-trigger prefetching. For static keys use a module-level constant. This repository uses React Compiler, so no manual hook memoization is needed.

```tsx
const prefetchKeys = ['/api/user/1', '/api/config']

function PrefetchUser() {
  useQueryPrefetch(prefetchKeys)
  return null
}
```

---

### useQueryContext

```tsx
function useQueryContext(): ContextValue
```

Returns the context value from the nearest `QueryProvider`. Uses React 19's `use()`.

---

### useQueryTransitionContext

```tsx
function useQueryTransitionContext(): QueryTransitionContextValue
```

Returns the transition context from the nearest `QueryTransition`. Uses React 19's `use()`.

---

## Types

```typescript
interface QueryInstance {
  readonly query?: Query
}

interface ContextValue extends QueryInstance {
  readonly clearOnForget?: boolean
  readonly ignoreTransitionContext?: boolean
}

interface QueryTransitionContextValue {
  readonly isPending?: boolean
  readonly startTransition?: TransitionStartFunction
}

type ResourceOptions<T> = ContextValue & Options<T> & QueryInstance

interface Resource<T> extends QueryActions<T>, BasicResource<T>, Status {
  readonly data: T
  readonly isPending: boolean
}

interface BasicResource<T> {
  readonly data: T
  readonly isPending: boolean
}

interface QueryActions<T> {
  readonly refetch: (options?: Options<T>) => Promise<T>
  readonly mutate: (value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>
  readonly forget: () => Promise<void>
}

interface Status {
  readonly expiresAt: Date
  readonly isExpired: boolean
  readonly isRefetching: boolean
  readonly isMutating: boolean
}

interface QueryProviderProps extends ContextValue {
  readonly children?: ReactNode
}

interface QueryTransitionProps {
  readonly isPending: boolean
  readonly startTransition: TransitionStartFunction
  readonly children?: ReactNode
}

interface QueryPrefetchProps extends QueryInstance {
  readonly keys: readonly string[]
  readonly children?: ReactNode
}

interface QueryPrefetchTagsProps extends LinkHTMLAttributes<HTMLLinkElement>, QueryInstance {
  readonly keys: readonly string[]
  readonly children?: ReactNode
}
```
