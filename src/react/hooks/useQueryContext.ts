import { Context, type ContextValue } from 'query/react:context'
import { use } from 'react'

/**
 * A React hook that retrieves the current query context value from the
 * nearest QueryProvider ancestor. Returns the context configuration
 * including the query instance and options like clearOnForget.
 * Without a provider, returns the context's undefined defaults rather than
 * throwing; useQueryInstance enforces the requirement for an actual client.
 *
 * @returns The current query context value containing the query instance
 *          and configuration options.
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { clearOnForget } = useQueryContext()
 *   return <span>{String(clearOnForget)}</span>
 * }
 * const view = <QueryProvider query={createQuery()} clearOnForget><Settings /></QueryProvider>
 * ```
 */
export function useQueryContext(): ContextValue {
  return use(Context)
}
