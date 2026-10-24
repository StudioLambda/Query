import { useEffect, useEffectEvent, use, useState, useTransition } from 'react'
import { type ContextValue } from 'query/react:context'
import { type Options } from 'query:index'
import { useQueryContext } from './useQueryContext'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'
import { useQueryTransitionContext } from './useQueryTransitionContext'

/**
 * The return type of the useQueryBasic hook, providing access to
 * the fetched data and the current pending state.
 *
 * @template T - The type of the fetched data.
 * @example
 * const resource: BasicResource<string> = { data: 'Ada', isPending: false }
 * console.log(resource.data) // 'Ada'
 */
export interface BasicResource<T = unknown> {
  /**
   * Latest resolved value retained from the selected query key.
   * Initial blocking reads suspend instead of returning a loading sentinel;
   * callers must treat shared cached objects as immutable.
   *
   * @example
   * const resource: BasicResource<string> = { data: 'Ada', isPending: false }
   * console.log(resource.data) // 'Ada'
   */
  readonly data: T

  /**
   * Pending state of the local or provider-selected React transition.
   * This is separate from initial Suspense loading and cache expiration.
   *
   * @example
   * const resource: BasicResource<string> = { data: 'Ada', isPending: false }
   * const view = <span aria-busy={resource.isPending}>{resource.data}</span>
   */
  readonly isPending: boolean
}

/**
 * Configuration options for the useQueryBasic hook, combining context values,
 * query options, and an optional query instance override.
 *
 * @template T - The type of the fetched data.
 * @example
 * const options: BasicResourceOptions<string> = {
 *   query: createQuery({ fetcher: async () => 'Ada' }), clearOnForget: true,
 * }
 * function Profile() { return <span>{useQueryBasic('profile', options).data}</span> }
 * const view = <Suspense fallback="Loading"><Profile /></Suspense>
 */
export type BasicResourceOptions<T = unknown> = ContextValue & Options<T> & QueryInstance

/**
 * A foundational React hook for fetching and subscribing to cached data.
 * Automatically handles data fetching, caching, and updates when the cache
 * changes. Uses React transitions for smooth UI updates during refetches.
 *
 * This hook provides the core data fetching functionality without the
 * additional actions (refetch, mutate, forget) or status information.
 * Use useQuery for a more complete solution.
 *
 * Freshness (from options or the instance) applies to a shared request
 * lifetime, not each render. Initial retries and same-key fresh consumers
 * share one request, even after expiration. The last consumer's cleanup
 * releases it; a later mount starts fresh again. Explicit refetch/query
 * actions can force new requests with effective fresh: true; otherwise they
 * retain normal cache policy. An abandoned initial render remains
 * reusable until the key is forgotten, request configuration changes, or the
 * instance is garbage-collected. Notification-only configuration preserves it.
 *
 * Refetch subscription failures preserve the rendered value; the query
 * instance reports them through its error event. Blocking render promises
 * still reject into the nearest error boundary, and action promises keep
 * their own rejection behavior.
 *
 * @template T - The type of the fetched data.
 * @param key - A unique string identifier for the cached resource.
 * @param options - Optional configuration for the query behavior.
 * @returns An object containing the fetched data and pending state.
 *
 * @example
 * ```tsx
 * import { Suspense } from 'react'
 * import { createRoot } from 'react-dom/client'
 * import { ErrorBoundary } from 'react-error-boundary'
 * import { createQuery } from '@studiolambda/query'
 * import { QueryProvider, useQueryBasic } from '@studiolambda/query/react'
 *
 * const query = createQuery({ fetcher: async () => 'Ada' })
 * function Profile() {
 *   const { data, isPending } = useQueryBasic<string>('profile')
 *   return <span aria-busy={isPending}>{data}</span>
 * }
 * createRoot(document.createElement('div')).render(
 *   <QueryProvider query={query}>
 *     <ErrorBoundary fallback={<span>Unavailable</span>}>
 *       <Suspense fallback="Loading"><Profile /></Suspense>
 *     </ErrorBoundary>
 *   </QueryProvider>
 * )
 * ```
 */
export function useQueryBasic<T = unknown>(
  key: string,
  options?: BasicResourceOptions<T>
): BasicResource<T> {
  const { clearOnForget: cClearOnForget, ignoreTransitionContext: cIgnoreTransitionContext } =
    useQueryContext()

  const {
    clearOnForget: oClearOnForget,
    ignoreTransitionContext: oIgnoreTransitionContext,
    expiration: oExpiration,
    fetcher: oFetcher,
    stale: oStale,
    removeOnError: oRemoveOnError,
    fresh: oFresh,
  } = options ?? {}

  const { isPending: isContextPending, startTransition: startContextTransition } =
    useQueryTransitionContext()

  const [isLocalPending, startLocalTransition] = useTransition()
  const { resource, subscribe } = useQueryInstance(options)
  const ignoreTransitionContext = oIgnoreTransitionContext ?? cIgnoreTransitionContext ?? false
  const isPending = ignoreTransitionContext ? isLocalPending : (isContextPending ?? isLocalPending)

  const startTransition = ignoreTransitionContext
    ? startLocalTransition
    : (startContextTransition ?? startLocalTransition)

  const clearOnForget = oClearOnForget ?? cClearOnForget ?? false

  /** Instance-owned selection survives initial renders discarded by Suspense. */
  const { promise, retain } = resource<T>(key, {
    expiration: oExpiration,
    fetcher: oFetcher,
    stale: oStale,
    removeOnError: oRemoveOnError,
    fresh: oFresh,
  })

  const resolved = use(promise)
  const [data, setData] = useState<T>(resolved)

  // Sync state when the resolved value changes (e.g. on key change).
  // useState only captures the initial value, so when the key changes
  // and the new data is already cached, use() returns new data but
  // useState ignores it. This comparison detects that drift and resets.
  if (data !== resolved) {
    setData(resolved)
  }

  useEffect(() => retain(), [retain])

  /**
   * Applies a completed fetch value inside the selected transition.
   * The effect event reads the latest transition without resubscribing.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
   *   <Suspense fallback="Loading"><Profile /></Suspense>
   * </QueryProvider>
   */
  const onResolved = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  /**
   * Tracks an asynchronous mutation in React's pending transition state.
   * Awaited results are committed inside another transition after resolution.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const query = createQuery({ fetcher: async () => 'Ada' })
   * const view = <QueryProvider query={query}><Suspense fallback="Loading"><Profile /></Suspense></QueryProvider>
   * await query.mutate('profile', 'Grace')
   */
  const onMutating = useEffectEvent(function (event: CustomEventInit<Promise<T>>) {
    startTransition(async function () {
      const value = await (event.detail as Promise<T>)

      startTransition(function () {
        setData(value)
      })
    })
  })

  /**
   * Reflects the value committed by the core's per-key mutation queue.
   * Completion details are values, not the mutating event's pending promise.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const query = createQuery({ fetcher: async () => 'Ada' })
   * const view = <QueryProvider query={query}><Suspense fallback="Loading"><Profile /></Suspense></QueryProvider>
   * await query.mutate('profile', 'Grace')
   */
  const onMutated = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  /**
   * Reflects explicitly seeded data without performing another query.
   * The shared value is retained; no clone is made for component state.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const query = createQuery({ fetcher: async () => 'Ada' })
   * const view = <QueryProvider query={query}><Suspense fallback="Loading"><Profile /></Suspense></QueryProvider>
   * query.hydrate('profile', 'Grace')
   */
  const onHydrated = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  /**
   * Tracks refetch progress without promoting observer failures to React
   * transition errors. The core owns error events and caller rejections;
   * a failed or aborted request has no new value for this subscription.
   * This also contains late rejections after the subscription key changes.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const query = createQuery({ fetcher: async () => 'Ada' })
   * const view = <QueryProvider query={query}><Suspense fallback="Loading"><Profile /></Suspense></QueryProvider>
   * await query.query('profile', { fresh: true })
   */
  const onRefetching = useEffectEvent(function (event: CustomEventInit<Promise<T>>) {
    startTransition(async function () {
      /** Only a successful refetch may replace the rendered value. */
      let value: T
      try {
        value = await (event.detail as Promise<T>)
      } catch {
        // Error reporting belongs to the query's error event and caller
        // promise, not this background observer's React error boundary.
        return
      }

      startTransition(function () {
        setData(value)
      })
    })
  })

  /**
   * Reselects forgotten data only when clearOnForget is enabled.
   * Fresh reads join the instance-owned selection; ordinary reads follow
   * cache policy. The selected transition wraps the replacement value.
   *
   * @example
   * function Profile() { return <span>{useQueryBasic<string>('profile').data}</span> }
   * const query = createQuery({ fetcher: async () => 'Ada' })
   * const view = <QueryProvider query={query} clearOnForget>
   *   <Suspense fallback="Loading"><Profile /></Suspense>
   * </QueryProvider>
   * await query.forget('profile')
   */
  const onForgotten = useEffectEvent(function () {
    if (clearOnForget) {
      startTransition(async function () {
        const { promise } = resource<T>(key, {
          expiration: oExpiration,
          fetcher: oFetcher,
          stale: oStale,
          removeOnError: oRemoveOnError,
          fresh: oFresh,
        })
        const data = await promise

        startTransition(function () {
          setData(data)
        })
      })
    }
  })

  useEffect(
    function () {
      const unsubscribeResolved = subscribe(key, 'resolved', onResolved)
      const unsubscribeMutating = subscribe(key, 'mutating', onMutating)
      const unsubscribeMutated = subscribe(key, 'mutated', onMutated)
      const unsubscribeHydrated = subscribe(key, 'hydrated', onHydrated)
      const unsubscribeRefetching = subscribe(key, 'refetching', onRefetching)
      const unsubscribeForgotten = subscribe(key, 'forgotten', onForgotten)

      return function () {
        unsubscribeResolved()
        unsubscribeMutating()
        unsubscribeMutated()
        unsubscribeHydrated()
        unsubscribeRefetching()
        unsubscribeForgotten()
      }
    },
    [key, subscribe]
  )

  return { data, isPending }
}
