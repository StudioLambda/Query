/** @jsxImportSource react */
import { afterEach, describe, it, vi } from 'vitest'
import { act, StrictMode, Suspense } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createQuery, type FetcherFunction, type Query } from 'query:index'
import { useQueryBasic } from './useQueryBasic'
import { useQuery } from './useQuery'
import { QueryProvider } from '../components/QueryProvider'

/**
 * Inputs for an uncompiled hook consumer. Freshness can come from either
 * the hook or its instance; undefined deliberately preserves instance defaults.
 */
interface ConsumerProps {
  /** The instance whose request lifetime is under test. */
  readonly instance: Query
  /** The cache key, changed without remounting to exercise hook state. */
  readonly resourceKey: string
  /** An optional per-hook override of instance freshness. */
  readonly fresh?: boolean
  /** Enables the hook's existing automatic reload after forgetting a key. */
  readonly clearOnForget?: boolean
}

/**
 * Reads through the actual hook under React DOM Suspense, rather than mocking
 * React's retry behavior. The caller supplies the surrounding boundary.
 */
function Consumer({ instance, resourceKey, fresh, clearOnForget }: ConsumerProps) {
  const { data } = useQueryBasic<string>(resourceKey, { query: instance, fresh, clearOnForget })
  return <p>{data}</p>
}

/**
 * Exercises the public hook's explicit refresh action independently of the
 * render request lifecycle. The test resolves all requests successfully.
 */
function RefreshConsumer({ instance, resourceKey }: ConsumerProps) {
  const { data, refetch } = useQuery<string>(resourceKey, { query: instance })
  return <button onClick={() => void refetch({ fresh: true })}>{data}</button>
}

/**
 * Creates manually delayed, abort-aware requests. Tests release each request
 * explicitly, so no wall-clock sleeps or scheduler timing determine success.
 */
function createDelayedFetcher() {
  const requests: Array<ReturnType<typeof Promise.withResolvers<string>>> = []
  const fetcher = vi.fn<FetcherFunction<string>>((_key, { signal }) => {
    const request = Promise.withResolvers<string>()
    requests.push(request)
    return request.promise.then((value) => {
      signal.throwIfAborted()
      return value
    })
  })
  return { fetcher, requests }
}

describe('fresh Suspense requests', () => {
  /** Roots are unmounted after every assertion path, including failed tests. */
  let root: Root | undefined

  afterEach(async () => {
    await act(async () => root?.unmount())
  })

  it('shares per-hook freshness across retries, rerenders and siblings', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, expiration: () => 0 })
    instance.hydrate('/fresh', 'old', { expiration: () => 10000 })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" fresh />
        </Suspense>
      )
    })
    expect(container.textContent).toBe('loading')
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => requests[0]!.resolve('new'))
    expect(container.textContent).toBe('new')

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" fresh />
          <Consumer instance={instance} resourceKey="/fresh" fresh />
        </Suspense>
      )
    })
    expect(container.textContent).toBe('newnew')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('honors instance freshness and a per-hook false override', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    instance.hydrate('/fresh', 'old', { expiration: () => 10000 })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" fresh={false} />
        </Suspense>
      )
    })
    expect(container.textContent).toBe('old')
    expect(fetcher).not.toHaveBeenCalled()

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer key="fresh" instance={instance} resourceKey="/fresh" />
        </Suspense>
      )
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => requests[0]!.resolve('new'))
    expect(container.textContent).toBe('new')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('starts a new request on key and instance changes', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const first = createQuery({ fetcher, fresh: true })
    const second = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    /** Updates props on the same component rather than forcing a React remount. */
    async function render(instance: Query, resourceKey: string) {
      await act(async () => {
        root!.render(
          <Suspense fallback="loading">
            <Consumer instance={instance} resourceKey={resourceKey} />
          </Suspense>
        )
      })
    }

    await render(first, '/a')
    await act(async () => requests[0]!.resolve('a'))
    expect(container.textContent).toBe('a')

    await render(first, '/b')
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(async () => requests[1]!.resolve('b'))
    expect(container.textContent).toBe('b')

    await render(second, '/b')
    expect(fetcher).toHaveBeenCalledTimes(3)
    await act(async () => requests[2]!.resolve('other b'))
    expect(container.textContent).toBe('other b')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('refreshes explicitly and gives later siblings the refreshed result', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" />
        </Suspense>
      )
    })
    await act(async () => requests[0]!.resolve('first'))

    await act(async () => {
      const refreshed = instance.query('/fresh', { fresh: true })
      requests[1]!.resolve('refreshed')
      await refreshed
    })
    expect(container.textContent).toBe('refreshed')

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" />
          <Consumer instance={instance} resourceKey="/fresh" />
        </Suspense>
      )
    })
    expect(container.textContent).toBe('refreshedrefreshed')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('starts fresh again after the last consumer unmounts', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    /** Mounts a consumer again after the previous one has fully released its lease. */
    async function render() {
      await act(async () => {
        root!.render(
          <Suspense fallback="loading">
            <Consumer instance={instance} resourceKey="/fresh" />
          </Suspense>
        )
      })
    }

    await render()
    await act(async () => requests[0]!.resolve('first'))
    await act(async () => root!.render(null))
    await render()
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(async () => requests[1]!.resolve('second'))
    expect(container.textContent).toBe('second')
  })

  it('shares initially suspended siblings and survives StrictMode effect replay', async ({
    expect,
  }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true, expiration: () => 0 })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <StrictMode>
          <Suspense fallback="loading">
            <Consumer instance={instance} resourceKey="/fresh" />
            <Consumer instance={instance} resourceKey="/fresh" />
          </Suspense>
        </StrictMode>
      )
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => requests[0]!.resolve('shared'))
    expect(container.textContent).toBe('sharedshared')

    await act(async () => {
      root!.render(
        <StrictMode>
          <Suspense fallback="loading">
            <Consumer instance={instance} resourceKey="/fresh" />
          </Suspense>
        </StrictMode>
      )
    })
    expect(container.textContent).toBe('shared')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('preserves an explicit fresh hook action', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <RefreshConsumer instance={instance} resourceKey="/fresh" />
        </Suspense>
      )
    })
    await act(async () => requests[0]!.resolve('first'))
    await act(async () => container.querySelector('button')!.click())
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(async () => requests[1]!.resolve('refreshed'))
    expect(container.textContent).toBe('refreshed')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('shares the automatic reload after forgetting a fresh resource', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <Suspense fallback="loading">
          <Consumer instance={instance} resourceKey="/fresh" clearOnForget />
        </Suspense>
      )
    })
    await act(async () => requests[0]!.resolve('first'))
    await act(async () => instance.forget('/fresh'))
    expect(fetcher).toHaveBeenCalledTimes(2)
    await act(async () => requests[1]!.resolve('reloaded'))
    expect(container.textContent).toBe('reloaded')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps the initial request when its provider configures broadcasting', async ({ expect }) => {
    const { fetcher, requests } = createDelayedFetcher()
    const instance = createQuery({ fetcher, fresh: true })
    const container = document.createElement('div')
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <QueryProvider query={instance}>
          <Suspense fallback="loading">
            <Consumer instance={instance} resourceKey="/provider-fresh" />
          </Suspense>
        </QueryProvider>
      )
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    await act(async () => requests[0]!.resolve('provided'))
    expect(container.textContent).toBe('provided')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
