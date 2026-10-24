import { type ReactNode } from 'react'
import { type QueryInstance } from 'query/react:hooks/useQueryInstance'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'

/**
 * Props for the QueryPrefetch component, extending the query instance
 * options with keys to prefetch and optional children.
 * Prefetch is client-effect work; children render without waiting for requests.
 *
 * @example
 * const props: QueryPrefetchProps = {
 *   keys: ['profile'], query: createQuery({ fetcher: async () => 'Ada' }),
 * }
 * const view = <QueryPrefetch {...props}>Dashboard</QueryPrefetch>
 */
export interface QueryPrefetchProps extends QueryInstance {
  /**
   * An array of cache keys to prefetch when the component mounts.
   * The array reference is an effect dependency; keep it stable when possible.
   * Normal cache policy applies, rather than unconditional network fetches.
   *
   * @example
   * const keys = ['profile']
   * const view = <QueryPrefetch keys={keys}
   *   query={createQuery({ fetcher: async () => 'Ada' })}>Dashboard</QueryPrefetch>
   */
  keys: readonly string[]

  /**
   * Content rendered immediately, before the client prefetch effect runs.
   * Children are not delayed until queries resolve or wrapped in Suspense.
   *
   * @example
   * const view = <QueryPrefetch keys={[]} query={createQuery()}>Dashboard</QueryPrefetch>
   */
  children?: ReactNode
}

/**
 * A React component that prefetches multiple query keys when mounted.
 * Useful for warming the cache with data that will be needed soon,
 * improving perceived performance when users navigate to views that
 * depend on this data.
 * It does not prefetch during SSR or block rendering, cancel on unmount,
 * catch fetch rejections, or subscribe children to data changes.
 *
 * @param props - The prefetch configuration and children.
 *
 * @example
 * ```tsx
 * const query = createQuery({ fetcher: async () => 'Ada' })
 * function Dashboard() {
 *   return (
 *     <QueryPrefetch keys={['/api/user/1', '/api/settings']} query={query}>
 *       Dashboard content
 *     </QueryPrefetch>
 *   )
 * }
 * const view = <Dashboard />
 * ```
 */
export function QueryPrefetch({ keys, query, children }: QueryPrefetchProps) {
  useQueryPrefetch(keys, { query })

  return children
}
