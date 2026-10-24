/**
 * Covers refetch observation separately from render and action errors.
 * Deferred promises and explicit cache expiration avoid sleeps; the React
 * roots run serially because act shares one scheduler queue per module.
 * Run with `npx vitest run src/react/hooks/useQueryBasic.errors.test.tsx`.
 */
import { describe, it, onTestFinished, vi } from 'vitest'
import { act, Suspense } from 'react'
import { createRoot, type RootOptions } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { createQuery, type Query } from 'query:index'
import { useQuery, type Resource } from './useQuery'

/**
 * Renders the public hook behind real React loading and error boundaries.
 * Each view owns its root and disposes it even when an assertion fails.
 * The latest resource exposes action promises without wrapping their errors.
 */
function createView(query: Query) {
  /**
   * Detached DOM output belongs to this view only. Assertions can inspect
   * the boundary fallback and pending attribute without global selectors.
   */
  const container = document.createElement('div')
  /**
   * Records errors React actually delivers to the boundary. Background
   * rejections must not reach this observer, while render failures must.
   */
  const onCaughtError = vi.fn<NonNullable<RootOptions['onCaughtError']>>()
  /**
   * Owns the view's DOM and expected caught-error reporting. Cleanup runs
   * through act so no effects remain active after a failed assertion.
   */
  const root = createRoot(container, { onCaughtError })
  /**
   * Retains the latest hook result for direct action-promise assertions.
   * It is undefined until the first successful render and is never mutated.
   */
  let resource: Resource<string> | undefined

  /**
   * Exercises useQueryBasic through the composed public hook, including
   * its pending state and the independently returned refetch action.
   */
  function Component({ queryKey }: { readonly queryKey: string }) {
    resource = useQuery<string>(queryKey, { query })
    return <p data-pending={resource.isPending}>{resource.data}</p>
  }

  onTestFinished(async () => {
    await act(async () => root.unmount())
  })

  /**
   * Reuses the mounted component when the key changes. Awaiting act flushes
   * subscriptions and transitions without timers or wall-clock delays.
   */
  async function render(queryKey: string) {
    // oxlint-disable-next-line
    await act(async () => {
      root.render(
        <ErrorBoundary fallback="error">
          <Suspense fallback="loading">
            <Component queryKey={queryKey} />
          </Suspense>
        </ErrorBoundary>
      )
    })
  }

  return {
    container,
    onCaughtError,
    render,
    get resource() {
      return resource
    },
  }
}

// React's act queue is global, so these root/transition tests must not overlap.
describe('useQueryBasic refetch errors', () => {
  it('retains stale rendered data and reports a background error', async ({ expect }) => {
    /** Controlled fetch settlement keeps the refetch subscription observable. */
    const fetch = Promise.withResolvers<string>()
    const query = createQuery({ fetcher: () => fetch.promise })
    const error = new Error('network offline')
    const onError = vi.fn<(event: CustomEventInit<unknown>) => void>()
    const unsubscribe = query.subscribe('/stale', 'error', onError)
    onTestFinished(unsubscribe)
    query.hydrate('/stale', 'initial', { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/stale')

    expect(view.container.innerText).toBe('initial')

    /**
     * Expire only for this query call, then restore validity before React
     * rerenders. Automatic retry/fresh lifecycle policy is outside this test.
     */
    const expiresAt = query.caches().items.get('/stale')!.expiresAt
    await act(async () => {
      const validUntil = expiresAt.getTime()
      expiresAt.setTime(0)
      const stale = query.query('/stale')
      expiresAt.setTime(validUntil)
      expect(await stale).toBe('initial')
    })

    expect(view.container.querySelector('p')?.dataset.pending).toBe('true')

    await act(async () => {
      fetch.reject(error)
    })

    expect(view.container.innerText).toBe('initial')
    expect(view.container.querySelector('p')?.dataset.pending).toBe('false')
    expect(await query.snapshot('/stale')).toBe('initial')
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ detail: error }))
    expect(view.onCaughtError).not.toHaveBeenCalled()
  })

  it('still sends an initial blocking failure to the error boundary', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const query = createQuery({ fetcher: () => fetch.promise })
    const error = new Error('initial load failed')
    // Retain one blocking promise across retries; refetch retry policy is
    // separate from whether useQueryBasic delivers render errors to React.
    query.hydrate('/initial', fetch.promise, { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/initial')
    expect(view.container.innerText).toBe('loading')

    await act(async () => {
      fetch.reject(error)
    })

    expect(view.container.innerText).toBe('error')
    expect(view.onCaughtError).toHaveBeenCalledExactlyOnceWith(error, expect.anything())
  })

  it('still replaces cached data after a successful refetch', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const query = createQuery({ fetcher: () => fetch.promise, expiration: () => 60_000 })
    query.hydrate('/success', 'initial', { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/success')

    await act(async () => {
      const result = view.resource!.refetch({ fresh: true })
      fetch.resolve('updated')
      expect(await result).toBe('updated')
    })

    expect(view.container.innerText).toBe('updated')
    expect(view.container.querySelector('p')?.dataset.pending).toBe('false')
    expect(view.onCaughtError).not.toHaveBeenCalled()
  })

  it('still rejects an explicit refetch action without replacing cached data', async ({
    expect,
  }) => {
    const fetch = Promise.withResolvers<string>()
    const query = createQuery({ fetcher: () => fetch.promise })
    const error = new Error('refresh failed')
    query.hydrate('/action', 'initial', { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/action')

    await act(async () => {
      const result = view.resource!.refetch({ fresh: true })
      const assertion = expect(result).rejects.toBe(error)
      fetch.reject(error)
      await assertion
    })

    expect(view.container.innerText).toBe('initial')
    expect(view.container.querySelector('p')?.dataset.pending).toBe('false')
    expect(view.onCaughtError).not.toHaveBeenCalled()
  })

  it('retains cached data when an observed refetch is aborted', async ({ expect }) => {
    /** The real abort signal controls the fetcher rejection, not a timer. */
    const query = createQuery({
      fetcher: (_key, { signal }) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    })
    const error = new Error('cancelled')
    query.hydrate('/aborted', 'initial', { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/aborted')

    /** Attach the caller's rejection handler before delivering the abort. */
    let assertion: Promise<void>
    await act(async () => {
      const result = view.resource!.refetch({ fresh: true })
      assertion = expect(result).rejects.toBe(error)
    })
    expect(view.container.querySelector('p')?.dataset.pending).toBe('true')

    await act(async () => {
      query.abort('/aborted', error)
      await assertion
    })

    expect(view.container.innerText).toBe('initial')
    expect(view.container.querySelector('p')?.dataset.pending).toBe('false')
    expect(await query.snapshot('/aborted')).toBe('initial')
    expect(view.onCaughtError).not.toHaveBeenCalled()
  })

  it('ignores a previous key refetch rejection after switching keys', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const query = createQuery({ fetcher: () => fetch.promise })
    const error = new Error('previous key failed')
    query.hydrate('/previous', 'previous', { expiration: () => 60_000 })
    query.hydrate('/current', 'current', { expiration: () => 60_000 })
    const view = createView(query)
    await view.render('/previous')

    /**
     * Observes the caller's rejection independently of the React observer.
     * The key changes while that observer still awaits the old request.
     */
    let assertion: Promise<void>
    await act(async () => {
      const result = view.resource!.refetch({ fresh: true })
      assertion = expect(result).rejects.toBe(error)
    })
    await view.render('/current')

    await act(async () => {
      fetch.reject(error)
      await assertion
    })

    expect(view.container.innerText).toBe('current')
    expect(view.container.querySelector('p')?.dataset.pending).toBe('false')
    expect(await query.snapshot('/current')).toBe('current')
    expect(view.onCaughtError).not.toHaveBeenCalled()
  })
})
