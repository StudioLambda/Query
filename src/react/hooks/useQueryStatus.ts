import { useEffect, useState } from 'react'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

/**
 * The return type of the useQueryStatus hook, providing real-time
 * information about the cache status for a specific key.
 * These are event/timer-derived hints, not a comprehensive request state
 * machine. In particular, expiration is not synchronously reset by a write.
 *
 * @example
 * const status: Status = {
 *   expiresAt: new Date(0), isExpired: true, isRefetching: false, isMutating: false,
 * }
 * console.log(status.isExpired) // true
 */
export interface Status {
  /**
   * The timestamp when the cached data will expire. After this time,
   * a later query may revalidate according to its stale/fresh policy.
   * Missing entries use the hook's current time. Do not mutate this Date.
   *
   * @example
   * function Timestamp() {
   *   const status = useQueryStatus('profile')
   *   return <time>{status.expiresAt.toISOString()}</time>
   * }
   * const view = <QueryProvider query={createQuery()}><Timestamp /></QueryProvider>
   */
  readonly expiresAt: Date

  /**
   * Indicates whether the cached data has expired. When true, the data
   * is considered stale. A timer marks this true; the current implementation
   * does not reset it to false when an entry gets a later expiration date.
   *
   * @example
   * function Staleness() {
   *   return <span>{String(useQueryStatus('profile').isExpired)}</span>
   * }
   * const view = <QueryProvider query={createQuery()}><Staleness /></QueryProvider>
   */
  readonly isExpired: boolean

  /**
   * Tracks refetching events until resolved/error events clear the flag.
   * This can describe blocking or background fetches. Aborted events are not
   * observed here, so the flag is not an authoritative active-request count.
   *
   * @example
   * function Progress() {
   *   return <span aria-busy={useQueryStatus('profile').isRefetching}>Profile</span>
   * }
   * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
   */
  readonly isRefetching: boolean

  /**
   * Tracks mutating events until a mutated/error event clears the flag.
   * It is a boolean event hint, not a count of queued mutations.
   *
   * @example
   * function Progress() {
   *   return <span aria-busy={useQueryStatus('profile').isMutating}>Profile</span>
   * }
   * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
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
 * function Progress() {
 *   const { isRefetching } = useQueryStatus('profile')
 *   return <span aria-busy={isRefetching}>Profile</span>
 * }
 * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
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
      /**
       * Marks the observed entry expired when its scheduled deadline passes.
       * The effect cleanup cancels this timer when the deadline changes.
       *
       * @example
       * function Expiration() { return <span>{String(useQueryStatus('profile').isExpired)}</span> }
       * const view = <QueryProvider query={createQuery()}><Expiration /></QueryProvider>
       */
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
      /**
       * Marks mutation activity when a queue operation starts.
       * This boolean intentionally does not count multiple queued operations.
       *
       * @example
       * function Progress() { return <span aria-busy={useQueryStatus('profile').isMutating}>Profile</span> }
       * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
       */
      function onMutating() {
        setIsMutating(true)
      }

      /**
       * Ends the mutation hint and reads the committed entry's deadline.
       * isExpired is left to its existing timer-derived behavior.
       *
       * @example
       * function Progress() { return <span aria-busy={useQueryStatus('profile').isMutating}>Profile</span> }
       * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
       */
      function onMutated() {
        setIsMutating(false)
        setExpiresAt(expiration(key) ?? new Date())
      }

      /**
       * Reschedules expiration after explicit cache seeding.
       * A missing local entry, including remote-only events, uses current time.
       *
       * @example
       * function Deadline() { return <time>{useQueryStatus('profile').expiresAt.toISOString()}</time> }
       * const view = <QueryProvider query={createQuery()}><Deadline /></QueryProvider>
       */
      function onHydrated() {
        setExpiresAt(expiration(key) ?? new Date())
      }

      /**
       * Reads the fetch commit's expiration and ends the refetch activity hint.
       * Remote events do not guarantee that a local cache entry exists.
       *
       * @example
       * function Progress() { return <span aria-busy={useQueryStatus('profile').isRefetching}>Profile</span> }
       * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
       */
      function onResolved() {
        setExpiresAt(expiration(key) ?? new Date())
        setIsRefetching(false)
      }

      /**
       * Updates the deadline after removal, normally to the current time.
       * Actual requerying belongs to useQueryBasic's clearOnForget policy.
       *
       * @example
       * function Deadline() { return <time>{useQueryStatus('profile').expiresAt.toISOString()}</time> }
       * const view = <QueryProvider query={createQuery()}><Deadline /></QueryProvider>
       */
      function onForgotten() {
        setExpiresAt(expiration(key) ?? new Date())
      }

      /**
       * Starts the refetch hint for a new or replayed active request event.
       * No request is initiated by this status observer.
       *
       * @example
       * function Progress() { return <span aria-busy={useQueryStatus('profile').isRefetching}>Profile</span> }
       * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
       */
      function onRefetching() {
        setIsRefetching(true)
      }

      /**
       * Clears both activity hints after a core error event for this key.
       * This observer neither retries requests nor handles caller rejections.
       *
       * @example
       * function Progress() { return <span aria-busy={useQueryStatus('profile').isRefetching}>Profile</span> }
       * const view = <QueryProvider query={createQuery()}><Progress /></QueryProvider>
       */
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
