import { createContext } from 'react'
import { type QueryInstance } from './hooks/useQueryInstance'

/**
 * The value type for the query context, extending the query instance
 * with additional configuration options that affect query behavior
 * throughout the component tree.
 */
export interface ContextValue extends QueryInstance {
  /**
   * When true, components will automatically refetch data after the
   * cache for a key is cleared via the forget method.
   */
  readonly clearOnForget?: boolean

  /**
   * When true, query components will use their own local transition
   * instead of the shared transition from QueryTransition context.
   */
  readonly ignoreTransitionContext?: boolean
}

/**
 * React context that provides the query instance and configuration
 * to all descendant components. Created with default undefined values.
 */
export const Context = createContext<ContextValue>({
  query: undefined,
  clearOnForget: undefined,
  ignoreTransitionContext: undefined,
})
