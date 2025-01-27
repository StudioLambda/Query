import { useEffect, use, useState, useMemo, useDebugValue, useTransition, useRef } from 'react'
import { ContextValue } from 'query/react:context'
import { Options } from 'query:index'
import { useQueryContext } from './useQueryContext'
import { QueryInstance, useQueryInstance } from './useQueryInstance'
import { useQueryTransitionContext } from './useQueryTransitionContext'
import { QueryActions, useQueryActions } from './useQueryActions'
import { useQueryStatus, type Status } from './useQueryStatus'

type AdditionalHooks<T> = QueryActions<T> & Status

export interface Resource<T = unknown> extends AdditionalHooks<T> {
  data: T
  isPending: boolean
}

export type ResourceOptions<T = unknown> = ContextValue & Options<T> & QueryInstance

export function useQuery<T = unknown>(key: string, options?: ResourceOptions<T>): Resource<T> {
  useDebugValue('useQuery')

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

  const initial = useRef<T>(undefined)

  if (initial.current === undefined) {
    initial.current = use(promise)
  }

  const [data, setData] = useState(initial.current)

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

  const actions = useQueryActions<T>(key, options)
  const status = useQueryStatus(key, options)

  function resourceHandler(): Resource<T> {
    return { data, isPending, ...actions, ...status }
  }

  return useMemo(resourceHandler, [data, isPending, actions, status])
}
