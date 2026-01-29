import type { QueryInstance } from 'query/react:hooks/useQueryInstance'
import type { ReactNode, LinkHTMLAttributes } from 'react'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'

/**
 * Combined type that merges HTML link element attributes with
 * query instance options for the QueryPrefetchTags component.
 */
type Additional = LinkHTMLAttributes<HTMLLinkElement> & QueryInstance

/**
 * Props for the QueryPrefetchTags component, extending link attributes
 * and query instance options with keys to prefetch and optional children.
 */
export interface QueryPrefetchTagsProps extends Additional {
  /**
   * An array of cache keys to prefetch when the component mounts.
   */
  keys: string[]

  /**
   * The child elements to render alongside the prefetch link tags.
   */
  children?: ReactNode
}

/**
 * A React component that prefetches multiple query keys and renders
 * corresponding link tags with rel="preload" for browser-level prefetching.
 * Combines the query library's prefetch mechanism with native browser
 * resource hints for optimal performance.
 *
 * @param props - The prefetch configuration, link attributes, and children.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <QueryPrefetchTags keys={['/api/user', '/api/config']}>
 *       <MainContent />
 *     </QueryPrefetchTags>
 *   )
 * }
 * ```
 */
export function QueryPrefetchTags({ keys, children, ...options }: QueryPrefetchTagsProps) {
  useQueryPrefetch(keys, options)

  const tags = keys.map((key) => <link rel="preload" href={key} as="fetch" {...options} />)

  return (
    <>
      {tags}
      {children}
    </>
  )
}
