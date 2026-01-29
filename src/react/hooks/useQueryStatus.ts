import { useEffect, useState } from 'react'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

/**
 * The return type of the useQueryStatus hook, providing real-time
 * information about the cache status for a specific key.
 */
export interface Status {
  /**
   * The timestamp when the cached data will expire. After this time,
   * the next query will trigger a background refetch.
   */
  readonly expiresAt: Date

  /**
   * Indicates whether the cached data has expired. When true, the data
   * is considered stale and will be refetched on the next query.
   */
  readonly isExpired: boolean

  /**
   * Indicates whether the data is currently being refetched in the
   * background while serving stale data.
   */
  readonly isRefetching: boolean

  /**
   * Indicates whether a mutation is currently in progress for this key.
   */
  readonly isMutating: boolean
}

/**
 * A React hook that subscribes to and returns the real-time status of a
 * cached query. Useful for displaying loading indicators, staleness
 * warnings, or optimistic UI updates.
 *
 * @param key - A unique string identifier for the cached resource.
 * @param options - Optional configuration containing a query instance.
 * @returns An object containing cache expiration and loading status.
 *
 * @example
 * ```tsx
 * const { isExpired, isRefetching, isMutating } = useQueryStatus('/api/user/1')
 *
 * return (
 *   <div>
 *     {isRefetching && <RefreshIndicator />}
 *     {isExpired && <StaleWarning />}
 *   </div>
 * )
 * ```
 */
export function useQueryStatus(key: string, options?: QueryInstance): Status {
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

  return { expiresAt, isExpired, isRefetching, isMutating }
}
