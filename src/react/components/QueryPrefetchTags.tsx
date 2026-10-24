import type { QueryInstance } from 'query/react:hooks/useQueryInstance'
import type { ReactNode, LinkHTMLAttributes } from 'react'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'

/**
 * Combined type that merges HTML link element attributes with
 * query instance options for the QueryPrefetchTags component.
 * Link attributes are forwarded after generated defaults, allowing overrides.
 *
 * @example
 * const attributes: Additional = { crossOrigin: 'anonymous', query: createQuery() }
 * const view = <QueryPrefetchTags keys={[]} {...attributes} />
 */
type Additional = LinkHTMLAttributes<HTMLLinkElement> & QueryInstance

/**
 * Props for the QueryPrefetchTags component, extending link attributes
 * and query instance options with keys to prefetch and optional children.
 * Forwarded link attributes can override rel, href, and as on every generated tag.
 *
 * @example
 * const props: QueryPrefetchTagsProps = { keys: [], query: createQuery(), crossOrigin: 'anonymous' }
 * const view = <QueryPrefetchTags {...props}>Dashboard</QueryPrefetchTags>
 */
export interface QueryPrefetchTagsProps extends Additional {
  /**
   * An array of cache keys to prefetch when the component mounts.
   * Each also becomes a link href by default; keep the array stable to avoid
   * repeating the client effect. Browser hints and query fetches are independent.
   *
   * @example
   * const view = <QueryPrefetchTags keys={['data:application/json,%22Ada%22']}
   *   query={createQuery({ fetcher: async () => 'Ada' })} />
   */
  keys: readonly string[]

  /**
   * The child elements to render alongside the prefetch link tags.
   * They render immediately without waiting for cache warming to finish.
   *
   * @example
   * const view = <QueryPrefetchTags keys={[]} query={createQuery()}>Dashboard</QueryPrefetchTags>
   */
  children?: ReactNode
}

/**
 * A React component that prefetches multiple query keys and renders
 * corresponding link tags with rel="preload" for browser-level prefetching.
 * Combines the query library's prefetch mechanism with native browser
 * resource hints. The browser may make a separate request; hints do not
 * guarantee deduplication with the query fetcher. The client effect does not
 * catch fetch rejections or cancel requests on unmount.
 *
 * @param props - The prefetch configuration, link attributes, and children.
 *
 * @example
 * ```tsx
 * const query = createQuery({ fetcher: async () => 'Ada' })
 * function App() {
 *   return (
 *     <QueryPrefetchTags keys={['data:application/json,%22Ada%22']} query={query}>
 *       Application content
 *     </QueryPrefetchTags>
 *   )
 * }
 * const view = <App />
 * ```
 */
export function QueryPrefetchTags({ keys, children, query, ...linkProps }: QueryPrefetchTagsProps) {
  useQueryPrefetch(keys, { query })

  const tags = keys.map((key) => (
    <link key={key} rel="preload" href={key} as="fetch" {...linkProps} />
  ))

  return (
    <>
      {tags}
      {children}
    </>
  )
}
