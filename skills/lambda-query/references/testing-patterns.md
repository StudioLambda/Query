# Testing Patterns

## Table of Contents

- [Test Setup](#test-setup)
- [Testing Core Query](#testing-core-query)
- [Testing React Components](#testing-react-components)
- [Common Patterns](#common-patterns)
- [Gotchas](#gotchas)

---

## Test Setup

- Framework: Vitest with `happy-dom` environment
- Use `describe.concurrent()` for parallel test execution
- Destructure `expect` from test context: `it('...', async ({ expect }) => { ... })`
- React tests use `act()` and `createRoot` (not `render` from testing-library)

```typescript
import { describe, it, vi } from 'vitest'
import { createQuery } from '@studiolambda/query'
```

---

## Testing Core Query

Create a query instance with a mock fetcher and exercise methods directly.

```typescript
describe.concurrent('query', function () {
  it('can query resources', async ({ expect }) => {
    function fetcher(key: string) {
      return Promise.resolve(key)
    }

    const { query } = createQuery({ fetcher })

    const result = await query<string>('example-key')
    expect(result).toBe('example-key')
  })

  it('deduplicates in-flight requests', async ({ expect }) => {
    let times = 0

    function fetcher() {
      times++
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve('done')
        }, 50)
      })
    }

    const { query } = createQuery({ fetcher })

    const [a, b] = await Promise.all([
      query<string>('key'),
      query<string>('key'),
    ])

    expect(a).toBe('done')
    expect(b).toBe('done')
    expect(times).toBe(1)
  })

  it('returns stale data while revalidating', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('example')
    }

    const { query } = createQuery({ fetcher, expiration: () => 100 })

    await query<string>('key')
    await new Promise((r) => setTimeout(r, 100))

    // Returns stale data immediately (default stale: true)
    const resource = await query<string>('key')
    expect(resource).toBe('example')
  })

  it('can mutate cached data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('original')
    }

    const q = createQuery({ fetcher })

    await q.query<string>('key')
    await q.mutate('key', 'updated')

    const value = await q.snapshot<string>('key')
    expect(value).toBe('updated')
  })

  it('can subscribe to events', async ({ expect }) => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const q = createQuery({ fetcher })

    const values: string[] = []
    q.subscribe<string>('key', 'resolved', function (event) {
      values.push(event.detail!)
    })

    await q.query<string>('key')
    expect(values).toEqual(['data'])
  })
})
```

---

## Testing React Components

**Pattern**: Create query with mock fetcher, pass via `{ query }` option to bypass context, use `query.next(key)` to await resolution.

```tsx
import { describe, it } from 'vitest'
import { createQuery } from '@studiolambda/query'
import { useQuery } from '@studiolambda/query/react'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

describe.concurrent('useQuery', function () {
  it('can query data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('works')
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      const { data } = useQuery<string>('/user', options)
      return data
    }

    const container = document.createElement('div')
    const promise = query.next<string>('/user')

    // oxlint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    await act(async function () {
      const result = await promise
      expect(result).toBe('works')
    })

    expect(container.innerText).toBe('works')
  })
})
```

### Step-by-step breakdown

1. **Create a mock fetcher** returning a resolved promise.
2. **Create a query instance** with the mock fetcher.
3. **Pass `{ query }` as options** to the hook — bypasses `QueryProvider` context.
4. **Call `query.next(key)` before rendering** — captures a promise that resolves when the query completes.
5. **Render inside `act()` + `<Suspense>`** — required because `useQuery` suspends.
6. **Await the `next()` promise inside a second `act()`** — ensures React processes the state update.
7. **Assert on `container.innerText`** — the rendered output.

---

## Common Patterns

### Testing mutations

```tsx
it('can mutate data', async ({ expect }) => {
  let value = 'initial'

  function fetcher() {
    return Promise.resolve(value)
  }

  const query = createQuery({ fetcher })

  function Component() {
    const { data, mutate } = useQuery<string>('/key', { query })
    return (
      <div>
        <span>{data}</span>
        <button onClick={() => mutate('updated')}>Update</button>
      </div>
    )
  }

  const container = document.createElement('div')
  const promise = query.next<string>('/key')

  await act(async function () {
    createRoot(container).render(
      <Suspense fallback="loading">
        <Component />
      </Suspense>
    )
  })

  await act(async function () {
    await promise
  })

  expect(container.querySelector('span')!.textContent).toBe('initial')

  // Trigger mutation
  await act(async function () {
    container.querySelector('button')!.click()
  })
})
```

### Testing with delayed fetchers

```typescript
function delayedFetcher<T>(value: T, ms: number) {
  return function () {
    return new Promise<T>(function (resolve) {
      setTimeout(function () {
        resolve(value)
      }, ms)
    })
  }
}
```

### Testing error handling

```typescript
it('emits error event on fetch failure', async ({ expect }) => {
  function fetcher() {
    return Promise.reject(new Error('fail'))
  }

  const q = createQuery({ fetcher })
  const errorPromise = q.once('key', 'error')

  try {
    await q.query('key')
  } catch {
    // expected
  }

  const event = await errorPromise
  expect(event.detail).toBeInstanceOf(Error)
})
```

---

## Gotchas

- **Always wrap renders in `act()`** — React state updates outside `act()` cause warnings and flaky tests.
- **Use two `act()` blocks** — one for initial render (triggers Suspense), one for awaiting the query resolution.
- **`query.next(key)` must be called before render** — it listens for the `refetching` event, which fires during the first render.
- **Pass `{ query }` directly to hooks** in tests — avoids needing `QueryProvider` in the test tree.
- **Use `describe.concurrent()`** — tests are independent and safe to run in parallel.
- **Destructure `expect` from context** — required for concurrent test isolation in Vitest.
- **Use `// oxlint-disable-next-line`** before `await act(async function () { ... })` — OxLint flags the floating promise pattern.
- **`vi.fn()` for mock fetchers** — use when you need to assert call counts or arguments.
