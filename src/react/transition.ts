import { createContext, type TransitionStartFunction } from 'react'

/**
 * The value type for the transition context, providing shared transition
 * state and control function for coordinating UI updates across multiple
 * query components.
 * Undefined members allow hooks to fall back to their local transition.
 *
 * @example
 * function Layout() {
 *   const [isPending, startTransition] = useTransition()
 *   const value: QueryTransitionContextValue = { isPending, startTransition }
 *   return <TransitionContext value={value}>Application</TransitionContext>
 * }
 * const view = <Layout />
 */
export interface QueryTransitionContextValue {
  /**
   * Indicates whether a transition is currently pending. When true,
   * components can show loading indicators or reduce visual updates.
   * This reports React transition work, not cache expiration or initial loading.
   *
   * @example
   * const value: QueryTransitionContextValue = { isPending: false }
   * console.log(value.isPending) // false
   */
  readonly isPending?: boolean

  /**
   * The function to start a transition, allowing components to wrap
   * state updates in a transition for smoother UI behavior.
   * When absent, query hooks use their own local transition starter.
   *
   * @example
   * function Layout() {
   *   const [isPending, startTransition] = useTransition()
   *   const value: QueryTransitionContextValue = { isPending, startTransition }
   *   return <TransitionContext value={value}>Application</TransitionContext>
   * }
   * const view = <Layout />
   */
  readonly startTransition?: TransitionStartFunction
}

/**
 * React context that provides shared transition state and control
 * to all descendant query components. Created with default undefined values.
 * QueryTransition is the usual provider; hooks can opt out per resource.
 *
 * @example
 * const view = <TransitionContext value={{ isPending: false }}>Application</TransitionContext>
 */
export const TransitionContext = createContext<QueryTransitionContextValue>({
  isPending: undefined,
  startTransition: undefined,
})
