# Testing Patterns

Use Vitest with happy-dom. Read adjacent regression tests before extending an affected path. Tests import source through the repository's `query:` aliases; consumer examples use the published `@studiolambda/query` paths.

## Core: deterministic overlap

Control pending work with `Promise.withResolvers()` rather than real sleeps. Assert caller results, cache contents, events, and resolver ownership separately: an obsolete caller settling is not evidence that it may publish.

```typescript
import { describe, it, vi } from 'vitest'
import { createQuery } from 'query:index'

describe.concurrent('mutation ordering', function () {
  it('serializes same-key functional mutations', async ({ expect }) => {
    const client = createQuery()
    client.hydrate('count', 0)
    const gate = Promise.withResolvers<void>()
    const first = client.mutate<number>('count', async (previous) => {
      await gate.promise
      return (previous ?? 0) + 1
    })
    const second = client.mutate<number>('count', (previous) => (previous ?? 0) + 1)

    gate.resolve()
    expect(await Promise.all([first, second])).toEqual([1, 2])
    expect(await client.snapshot('count')).toBe(2)
  })

  it('does not publish a fetch superseded by hydration', async ({ expect }) => {
    const pending = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => pending.promise })
    const resolved = vi.fn()
    const unsubscribe = client.subscribe('key', 'resolved', resolved)
    const request = client.query('key')

    client.hydrate('key', 'local')
    pending.resolve('remote')
    expect(await request).toBe('remote')
    expect(await client.snapshot('key')).toBe('local')
    expect(resolved).not.toHaveBeenCalled()
    unsubscribe()
  })
})
```

For immediately stale data, hydrate with the default zero lifetime; the next ordinary query starts revalidation immediately. For valid cached data, use a long explicit expiration. Use controlled time only when testing the timer itself. Tests using global fake timers or global `BroadcastChannel` substitutes should run in a sequential suite and restore globals in cleanup.

## React: render, settle, clean up

Use `act()` and `createRoot`, and always unmount roots. A query option bypasses the need for a provider when testing an isolated hook. Include a provider when testing broadcast ownership or context behavior.

```tsx
import { describe, it } from 'vitest'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createQuery } from 'query:index'
import { useQuery } from 'query/react:hooks/useQuery'

describe.concurrent('fresh Suspense', function () {
  it('shares a fresh request across initial retries', async ({ expect }) => {
    const pending = Promise.withResolvers<string>()
    let calls = 0
    const query = createQuery({
      fetcher: () => {
        calls += 1
        return pending.promise
      },
      fresh: true,
    })
    function Component() {
      const { data } = useQuery<string>('key', { query })
      return <span>{data}</span>
    }
    const container = document.createElement('div')
    const root = createRoot(container)

    try {
      await act(async () => {
        root.render(<Suspense fallback="loading"><Component /></Suspense>)
      })
      expect(container.textContent).toBe('loading')
      await act(async () => {
        pending.resolve('ready')
        await pending.promise
      })
      expect(container.textContent).toBe('ready')
      expect(calls).toBe(1)
    } finally {
      await act(async () => root.unmount())
    }
  })
})
```

When using `query.next(key)`, register it before the triggering render/action. It listens for `refetching`, not a generic cache update: mutations, hydration, and unexpired cache hits need their own synchronization. Catch expected action rejections inside `act()`; separately assert the instance's `error` event and stale rendered data. Use an error boundary when asserting initial blocking failures.

## Regression checklist

Choose scenarios for the behavior being changed; do not add a new evaluation framework for a factual documentation update.

| Change | Scenarios | Existing tests |
| --- | --- | --- |
| Request ownership | Abort old fetch, start replacement, settle old success/failure; replacement remains owner | `src/query/requestOwnership.test.ts` |
| Mutation ordering | Two same-key functional updates; rejection recovery; independent keys; fetch superseded by mutation/hydration | `src/query/ordering.test.ts` |
| Broadcast isolation | No implicit channel; scoped delivery; malformed/disallowed messages; shared provider listener; caller-owned close | `src/react/components/QueryProvider.broadcast.test.tsx` |
| Background errors | Expired stale view survives failure/abort; action still rejects | `src/react/hooks/useQueryBasic.errors.test.tsx` |
| Fresh Suspense | Initial retries, siblings, StrictMode, rerenders after expiration, final release/remount, invalidation, instance defaults | `src/react/hooks/useQueryFresh.test.tsx`, `src/query/resource.test.ts` |

Use test-context `expect` in concurrent suites. Keep mutable fixtures local; restore mocks, unsubscribe listeners, and close caller-created channels. Assert expected failures with `await expect(promise).rejects...` rather than swallowing errors. Check `package.json` for the current test/build commands.
