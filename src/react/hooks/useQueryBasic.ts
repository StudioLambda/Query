import { useEffect, use, useState, useMemo, useDebugValue, useTransition } from 'react'
import { type ContextValue } from 'query/react:context'
import { type Options } from 'query:index'
import { useQueryContext } from './useQueryContext'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'
import { useQueryTransitionContext } from './useQueryTransitionContext'

export interface BasicResource<T = unknown> {
  data: T
  isPending: boolean
}

export type BasicResourceOptions<T = unknown> = ContextValue & Options<T> & QueryInstance

export function useQueryBasic<T = unknown>(
  key: string,
  options?: BasicResourceOptions<T>
): BasicResource<T> {
  useDebugValue('useQueryBasic')

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
  const { query, expiration, subscribe } = useQueryInstance(options)

  function ignoreTransitionContextHandler() {
    return oIgnoreTransitionContext ?? cIgnoreTransitionContext ?? false
  }

  const ignoreTransitionContext = useMemo(ignoreTransitionContextHandler, [
    oIgnoreTransitionContext,
    cIgnoreTransitionContext,
  ])

  function isPendingHandler() {
    if (ignoreTransitionContext) {
      return isLocalPending
    }

    return isContextPending ?? isLocalPending
  }

  const isPending = useMemo(isPendingHandler, [
    isContextPending,
    isLocalPending,
    ignoreTransitionContext,
  ])

  function startTransitionHandler() {
    if (ignoreTransitionContext) {
      return startLocalTransition
    }

    return startContextTransition ?? startLocalTransition
  }

  const startTransition = useMemo(startTransitionHandler, [
    startContextTransition,
    startLocalTransition,
    ignoreTransitionContext,
  ])

  function clearOnForgetHandler() {
    return oClearOnForget ?? cClearOnForget ?? false
  }

  const clearOnForget = useMemo(clearOnForgetHandler, [oClearOnForget, cClearOnForget])

  function promiseHandler() {
    return query<T>(key, {
      expiration: oExpiration,
      fetcher: oFetcher,
      stale: oStale,
      removeOnError: oRemoveOnError,
      fresh: oFresh,
    })
  }

  const promise = useMemo(promiseHandler, [
    query,
    key,
    oExpiration,
    oFetcher,
    oStale,
    oRemoveOnError,
    oFresh,
  ])

  const [data, setData] = useState<T>(use(promise))

  function subscribeHandler() {
    function onResolved(event: CustomEventInit<T>) {
      startTransition(function () {
        setData(event.detail as T)
      })
    }

    function onMutating(event: CustomEventInit<Promise<T>>) {
      startTransition(async function () {
        const value = await (event.detail as Promise<T>)

        startTransition(function () {
          setData(value)
        })
      })
    }

    function onMutated(event: CustomEventInit<T>) {
      startTransition(function () {
        setData(event.detail as T)
      })
    }

    function onHydrated(event: CustomEventInit<T>) {
      startTransition(function () {
        setData(event.detail as T)
      })
    }

    function onRefetching(event: CustomEventInit<Promise<T>>) {
      startTransition(async function () {
        const value = await (event.detail as Promise<T>)

        startTransition(function () {
          setData(value)
        })
      })
    }

    function onForgotten() {
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
    }

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
  }

  useEffect(subscribeHandler, [
    query,
    expiration,
    subscribe,
    key,
    clearOnForget,
    oExpiration,
    oFetcher,
    oStale,
    oRemoveOnError,
    oFresh,
    startTransition,
  ])

  function resourceHandler(): BasicResource<T> {
    return { data, isPending }
  }

  return useMemo(resourceHandler, [data, isPending])
}
