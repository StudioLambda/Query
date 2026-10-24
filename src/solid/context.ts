import { type Accessor, createContext } from 'solid-js'
import { type Query } from 'query:index'

/**
 * Additional configuration options for the Solid.js query context
 * that affect query behavior throughout the component tree.
 * These bindings are source-only: no Solid subpath is published in package.json.
 * The provider passes this setting through; there is no Solid data hook here
 * to implement clear-on-forget behavior.
 *
 * @example
 * const options: QueryContextOptions = { clearOnForget: true }
 * console.log(options.clearOnForget) // true
 */
export interface QueryContextOptions {
  /**
   * Carries a requested clear-on-forget policy for prospective data consumers.
   * The current source-only Solid provider stores it but does not refetch data.
   *
   * @example
   * const options: QueryContextOptions = { clearOnForget: true }
   * console.log(options.clearOnForget) // true
   */
  readonly clearOnForget?: boolean
}

/**
 * The value type for the Solid.js query context, providing reactive
 * accessors to the query instance and additional configuration options.
 * Accessors are optional outside a provider; consumers must handle absence.
 *
 * @example
 * const query = createQuery()
 * const value: QueryContextValue = { query: () => query, additional: () => ({}) }
 * console.log(value.query?.().keys()) // []
 */
export interface QueryContextValue {
  /**
   * Reactive accessor to the query instance.
   * The provider can replace the instance when its reactive inputs change.
   *
   * @example
   * const instance = createQuery()
   * const value: QueryContextValue = { query: () => instance }
   * console.log(value.query?.().keys()) // []
   */
  readonly query?: Accessor<Query>

  /**
   * Reactive accessor to additional context options.
   * Missing context yields undefined; the provider returns its current policy.
   *
   * @example
   * const value: QueryContextValue = { additional: () => ({ clearOnForget: true }) }
   * console.log(value.additional?.().clearOnForget) // true
   */
  readonly additional?: Accessor<QueryContextOptions>
}

/**
 * Solid.js context that provides the query instance and configuration
 * to all descendant components. Created with default undefined values.
 * It is available through repository source imports only, not an npm subpath.
 *
 * @example
 * import { useContext } from 'solid-js'
 * function Consumer() {
 *   const value = useContext(QueryContext)
 *   return <span>{value.query?.().keys().length ?? 0}</span>
 * }
 * const view = <QueryContext.Provider value={{ query: () => createQuery() }}>
 *   <Consumer />
 * </QueryContext.Provider>
 */
export const QueryContext = createContext<QueryContextValue>({
  query: undefined,
  additional: undefined,
})
