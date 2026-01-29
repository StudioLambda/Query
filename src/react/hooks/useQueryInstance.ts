import { type Query } from 'query:index'
import { useQueryContext } from 'query/react:hooks/useQueryContext'

/**
 * Options interface that allows providing a custom query instance,
 * overriding the one from the context.
 */
export interface QueryInstance {
  /**
   * An optional query instance to use instead of the context query.
   */
  readonly query?: Query
}

/**
 * Error thrown when no query instance is available from either
 * the options or the context.
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
 * const query = useQueryInstance()
 * const data = await query('key')
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
