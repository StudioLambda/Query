import { useEffect } from 'react'
import { type QueryInstance, useQueryInstance } from './useQueryInstance'

/**
 * A React hook that prefetches multiple query keys on mount. Useful for
 * warming the cache with data that will be needed soon, improving perceived
 * performance when the user navigates to views that use these keys.
 *
 * @param keys - An array of cache keys to prefetch.
 * @param options - Optional configuration containing a query instance.
 *
 * @example
 * ```tsx
 * // Prefetch user data when the dashboard loads
 * useQueryPrefetch(['/api/user/1', '/api/user/2', '/api/user/3'])
 * ```
 */
export function useQueryPrefetch(keys: string[], options?: QueryInstance) {
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
