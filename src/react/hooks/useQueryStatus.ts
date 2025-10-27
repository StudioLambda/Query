import { useDebugValue, useEffect, useMemo, useState } from 'react'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

export interface Status {
  readonly expiresAt: Date
  readonly isExpired: boolean
  readonly isRefetching: boolean
  readonly isMutating: boolean
}

export function useQueryStatus(key: string, options?: QueryInstance): Status {
  useDebugValue('useQueryStatus')

  const { expiration, subscribe } = useQueryInstance(options)
  const [expiresAt, setExpiresAt] = useState<Date>(() => expiration(key) ?? new Date())
  const [isExpired, setIsExpired] = useState(() => Date.now() > expiresAt.getTime())
  const [isRefetching, setIsRefetching] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  useEffect(
    function () {
      function handler() {
        setIsExpired(true)
      }

      const id = setTimeout(handler, expiresAt.getTime() - Date.now())

      return function () {
        clearTimeout(id)
      }
    },
    [expiresAt]
  )

  useEffect(
    function () {
      function onMutating() {
        setIsMutating(true)
      }

      function onMutated() {
        setIsMutating(false)
        setExpiresAt(expiration(key) ?? new Date())
      }

      function onHydrated() {
        setExpiresAt(expiration(key) ?? new Date())
      }

      function onResolved() {
        setExpiresAt(expiration(key) ?? new Date())
        setIsRefetching(false)
      }

      function onForgotten() {
        setExpiresAt(expiration(key) ?? new Date())
      }

      function onRefetching() {
        setIsRefetching(true)
      }

      function onError() {
        setIsRefetching(false)
        setIsMutating(false)
      }

      const unsubscribeMutating = subscribe(key, 'mutating', onMutating)
      const unsubscribeMutated = subscribe(key, 'mutated', onMutated)
      const unsubscribeHydrated = subscribe(key, 'hydrated', onHydrated)
      const unsubscribeResolved = subscribe(key, 'resolved', onResolved)
      const unsubscribeForgotten = subscribe(key, 'forgotten', onForgotten)
      const unsubscribeRefetching = subscribe(key, 'refetching', onRefetching)
      const unsubscribeError = subscribe(key, 'error', onError)

      return function () {
        unsubscribeMutating()
        unsubscribeMutated()
        unsubscribeHydrated()
        unsubscribeResolved()
        unsubscribeForgotten()
        unsubscribeRefetching()
        unsubscribeError()
      }
    },
    [key, subscribe, expiration]
  )

  return useMemo(
    function () {
      return { expiresAt, isExpired, isRefetching, isMutating }
    },
    [expiresAt, isExpired, isRefetching, isMutating]
  )
}
