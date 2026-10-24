import { type Query } from 'query:index'
import { useQueryContext } from 'query/react:hooks/useQueryContext'

/**
 * Options interface that allows providing a custom query instance,
 * overriding the one from the context.
 * Omission uses the nearest provider; if both are absent, the hook throws.
 *
 * @example
 * const options: QueryInstance = { query: createQuery() }
 * function Count() { return <span>{useQueryInstance(options).keys().length}</span> }
 * const view = <Count />
 */
export interface QueryInstance {
  /**
   * An optional query instance to use instead of the context query.
   * The reference is retained; the hook neither configures nor disposes it.
   *
   * @example
   * const options: QueryInstance = { query: createQuery() }
   * console.log(options.query?.keys()) // []
   */
  readonly query?: Query
}

/**
 * Error thrown when no query instance is available from either
 * the options or the context.
 * This shared Error instance is thrown by useQueryInstance; callers normally
 * prevent it by supplying QueryProvider or an explicit query option.
 *
 * @example
 * function MissingProvider() { useQueryInstance(); return null }
 * const view = <ErrorBoundary fallback={<span>Provide a query</span>}
 *   onError={(error) => console.log(error === ErrNoQueryInstanceFound)}>
 *   <MissingProvider />
 * </ErrorBoundary>
 */
export const ErrNoQueryInstanceFound = new Error(
  'No query instance was found. Please provide one via the resource options or the query context.'
)

/**
 * A React hook that resolves the query instance to use, preferring the
 * instance from options over the one from context. Throws an error if
 * no instance is available.
 *
 * @param options - Optional configuration containing a query instance.
 * @returns The resolved query instance.
 * @throws Error if no query instance is found in options or context.
 *
 * @example
 * ```tsx
 * const query = createQuery()
 * function CachedKeys() {
 *   const instance = useQueryInstance({ query })
 *   return <span>{instance.keys().join(', ')}</span>
 * }
 * const view = <CachedKeys />
 * ```
 */
export function useQueryInstance(options?: QueryInstance): Query {
  const { query: cQuery } = useQueryContext()
  const { query: oQuery } = options ?? {}
  const instance = oQuery ?? cQuery

  if (!instance) {
    throw ErrNoQueryInstanceFound
  }

  return instance
}
