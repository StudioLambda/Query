import { Context, type ContextValue } from 'query/react:context'
import { use } from 'react'

/**
 * A React hook that retrieves the current query context value from the
 * nearest QueryProvider ancestor. Returns the context configuration
 * including the query instance and options like clearOnForget.
 *
 * @returns The current query context value containing the query instance
 *          and configuration options.
 *
 * @example
 * ```tsx
 * const { query, clearOnForget } = useQueryContext()
 * ```
 */
export function useQueryContext(): ContextValue {
  return use(Context)
}
