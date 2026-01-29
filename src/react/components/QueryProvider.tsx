import { useEffect, type ReactNode } from 'react'
import { Context, type ContextValue } from 'query/react:context'
import { createQuery } from 'query:index'

/**
 * Props for the QueryProvider component, extending the context value
 * configuration with optional children.
 */
export interface QueryProviderProps extends ContextValue {
  /**
   * The child elements to render within the provider context.
   */
  children?: ReactNode
}

/**
 * A React component that provides query context to its descendants.
 * Creates a query instance if not provided, sets up a BroadcastChannel
 * for cross-tab synchronization, and makes the query available to all
 * child components via React context.
 *
 * @param props - The provider configuration and children.
 *
 * @example
 * ```tsx
 * import { QueryProvider, createQuery } from '@studiolambda/query/react'
 *
 * const query = createQuery({ fetcher: customFetcher })
 *
 * function App() {
 *   return (
 *     <QueryProvider query={query} clearOnForget>
 *       <MyComponents />
 *     </QueryProvider>
 *   )
 * }
 * ```
 */
export function QueryProvider({
  children,
  clearOnForget,
  ignoreTransitionContext,
  query,
}: QueryProviderProps) {
  const localQuery = query ?? createQuery()

  useEffect(
    function () {
      const broadcast = new BroadcastChannel('query')

      localQuery.configure({ broadcast })

      const unsubscribe = localQuery.subscribeBroadcast()

      return function () {
        unsubscribe()
        broadcast.close()
      }
    },
    [localQuery]
  )

  const value = { query: localQuery, clearOnForget, ignoreTransitionContext }

  return <Context value={value}>{children}</Context>
}
