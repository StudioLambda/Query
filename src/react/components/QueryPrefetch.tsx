import { type ReactNode } from 'react'
import { type QueryInstance } from 'query/react:hooks/useQueryInstance'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'

/**
 * Props for the QueryPrefetch component, extending the query instance
 * options with keys to prefetch and optional children.
 */
export interface QueryPrefetchProps extends QueryInstance {
  /**
   * An array of cache keys to prefetch when the component mounts.
   */
  keys: string[]

  /**
   * The child elements to render after initiating the prefetch.
   */
  children?: ReactNode
}

/**
 * A React component that prefetches multiple query keys when mounted.
 * Useful for warming the cache with data that will be needed soon,
 * improving perceived performance when users navigate to views that
 * depend on this data.
 *
 * @param props - The prefetch configuration and children.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   return (
 *     <QueryPrefetch keys={['/api/user/1', '/api/settings']}>
 *       <DashboardContent />
 *     </QueryPrefetch>
 *   )
 * }
 * ```
 */
export function QueryPrefetch({ keys, query, children }: QueryPrefetchProps) {
  useQueryPrefetch(keys, { query })

  return children
}
