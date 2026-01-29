import { createContext, type TransitionStartFunction } from 'react'

/**
 * The value type for the transition context, providing shared transition
 * state and control function for coordinating UI updates across multiple
 * query components.
 */
export interface QueryTransitionContextValue {
  /**
   * Indicates whether a transition is currently pending. When true,
   * components can show loading indicators or reduce visual updates.
   */
  readonly isPending?: boolean

  /**
   * The function to start a transition, allowing components to wrap
   * state updates in a transition for smoother UI behavior.
   */
  readonly startTransition?: TransitionStartFunction
}

/**
 * React context that provides shared transition state and control
 * to all descendant query components. Created with default undefined values.
 */
export const TransitionContext = createContext<QueryTransitionContextValue>({
  isPending: undefined,
  startTransition: undefined,
})
