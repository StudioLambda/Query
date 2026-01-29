import { type Accessor, createContext } from 'solid-js'
import { type Query } from 'query:index'

/**
 * Additional configuration options for the Solid.js query context
 * that affect query behavior throughout the component tree.
 */
export interface QueryContextOptions {
  /**
   * When true, components will automatically refetch data after the
   * cache for a key is cleared via the forget method.
   */
  readonly clearOnForget?: boolean
}

/**
 * The value type for the Solid.js query context, providing reactive
 * accessors to the query instance and additional configuration options.
 */
export interface QueryContextValue {
  /**
   * Reactive accessor to the query instance.
   */
  readonly query?: Accessor<Query>

  /**
   * Reactive accessor to additional context options.
   */
  readonly additional?: Accessor<QueryContextOptions>
}

/**
 * Solid.js context that provides the query instance and configuration
 * to all descendant components. Created with default undefined values.
 */
export const QueryContext = createContext<QueryContextValue>({
  query: undefined,
  additional: undefined,
})
