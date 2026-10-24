import { useEffect } from 'react'
import { type QueryInstance, useQueryInstance } from './useQueryInstance'

/**
 * A React hook that prefetches multiple query keys on mount. Useful for
 * warming the cache with data that will be needed soon, improving perceived
 * performance when the user navigates to views that use these keys.
 * Fetching starts in a client effect, not during SSR. The array reference is
 * an effect dependency; changing it reissues queries under normal cache policy.
 * This hook does not expose or catch request promises, cancel on unmount, or
 * guarantee success. Use query.query() directly when failures need handling.
 *
 * @param keys - An array of cache keys to prefetch.
 * @param options - Optional configuration containing a query instance.
 *
 * @example
 * ```tsx
 * const keys = ['profile', 'settings']
 * const query = createQuery({ fetcher: async (key) => key })
 * function Dashboard() {
 *   useQueryPrefetch(keys, { query })
 *   return <span>Dashboard</span>
 * }
 * const view = <Dashboard />
 * ```
 */
export function useQueryPrefetch(keys: readonly string[], options?: QueryInstance) {
  const { query } = useQueryInstance(options)

  useEffect(
    function () {
      for (const key of keys) {
        void query(key)
      }
    },
    [query, keys]
  )
}
