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
 */
export interface BasicResource<T = unknown> {
  /**
   * The fetched data for the given key.
   */
  readonly data: T

  /**
   * Indicates whether a transition is currently pending.
   */
  readonly isPending: boolean
}

/**
 * Configuration options for the useQueryBasic hook, combining context values,
 * query options, and an optional query instance override.
 *
 * @template T - The type of the fetched data.
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
 * @template T - The type of the fetched data.
 * @param key - A unique string identifier for the cached resource.
 * @param options - Optional configuration for the query behavior.
 * @returns An object containing the fetched data and pending state.
 *
 * @example
 * ```tsx
 * const { data, isPending } = useQueryBasic<User>('/api/user/1')
 *
 * if (isPending) return <Loading />
 * return <UserProfile user={data} />
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
  const { query, subscribe } = useQueryInstance(options)
  const ignoreTransitionContext = oIgnoreTransitionContext ?? cIgnoreTransitionContext ?? false
  const isPending = ignoreTransitionContext ? isLocalPending : (isContextPending ?? isLocalPending)

  const startTransition = ignoreTransitionContext
    ? startLocalTransition
    : (startContextTransition ?? startLocalTransition)

  const clearOnForget = oClearOnForget ?? cClearOnForget ?? false

  const promise = query<T>(key, {
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

  const onResolved = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  const onMutating = useEffectEvent(function (event: CustomEventInit<Promise<T>>) {
    startTransition(async function () {
      const value = await (event.detail as Promise<T>)

      startTransition(function () {
        setData(value)
      })
    })
  })

  const onMutated = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  const onHydrated = useEffectEvent(function (event: CustomEventInit<T>) {
    startTransition(function () {
      setData(event.detail as T)
    })
  })

  const onRefetching = useEffectEvent(function (event: CustomEventInit<Promise<T>>) {
    startTransition(async function () {
      const value = await (event.detail as Promise<T>)

      startTransition(function () {
        setData(value)
      })
    })
  })

  const onForgotten = useEffectEvent(function () {
    if (clearOnForget) {
      startTransition(async function () {
        const data = await query<T>(key, {
          expiration: oExpiration,
          fetcher: oFetcher,
          stale: oStale,
          removeOnError: oRemoveOnError,
          fresh: oFresh,
        })

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
