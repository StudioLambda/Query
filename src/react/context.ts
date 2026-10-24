import { createContext } from 'react'
import { type QueryInstance } from './hooks/useQueryInstance'

/**
 * The value type for the query context, extending the query instance
 * with additional configuration options that affect query behavior
 * throughout the component tree.
 * An explicit hook option overrides the corresponding provider value.
 *
 * @example
 * const value: ContextValue = { query: createQuery(), clearOnForget: true }
 * const view = <Context value={value}>Application</Context>
 */
export interface ContextValue extends QueryInstance {
  /**
   * When true, components will automatically refetch data after the
   * cache for a key is cleared via the forget method.
   * Defaults to false in useQueryBasic; forgetting alone does not cancel I/O.
   *
   * @example
   * const value: ContextValue = { query: createQuery(), clearOnForget: true }
   * const view = <Context value={value}>Application</Context>
   */
  readonly clearOnForget?: boolean

  /**
   * When true, query components will use their own local transition
   * instead of the shared transition from QueryTransition context.
   * Defaults to false; an absent shared transition still falls back locally.
   *
   * @example
   * const value: ContextValue = { query: createQuery(), ignoreTransitionContext: true }
   * const view = <Context value={value}>Application</Context>
   */
  readonly ignoreTransitionContext?: boolean
}

/**
 * React context that provides the query instance and configuration
 * to all descendant components. Created with default undefined values.
 * Prefer QueryProvider, which also manages incoming broadcast subscriptions.
 * Rendering Context directly supplies values but acquires no subscriptions.
 *
 * @example
 * const value: ContextValue = { query: createQuery() }
 * const view = <Context value={value}>Application</Context>
 */
export const Context = createContext<ContextValue>({
  query: undefined,
  clearOnForget: undefined,
  ignoreTransitionContext: undefined,
})
