import { TransitionContext } from 'query/react:transition'
import { type ReactNode, type TransitionStartFunction } from 'react'

/**
 * Props for the QueryTransition component, providing transition state
 * and control function to be shared with descendant query components.
 */
export interface QueryTransitionProps {
  /**
   * Indicates whether a transition is currently pending.
   */
  isPending: boolean

  /**
   * The function to start a transition, typically from useTransition.
   */
  startTransition: TransitionStartFunction

  /**
   * The child elements that will have access to the transition context.
   */
  children?: ReactNode
}

/**
 * A React component that provides a shared transition context to its
 * descendants. Allows multiple query components to coordinate their
 * UI updates through a single transition, preventing visual flickering
 * and ensuring smooth updates across related components.
 *
 * @param props - The transition state, function, and children.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [isPending, startTransition] = useTransition()
 *
 *   return (
 *     <QueryTransition isPending={isPending} startTransition={startTransition}>
 *       <UserList />
 *       <UserDetails />
 *     </QueryTransition>
 *   )
 * }
 * ```
 */
export function QueryTransition({ children, startTransition, isPending }: QueryTransitionProps) {
  const value = { startTransition, isPending }

  return <TransitionContext value={value}>{children}</TransitionContext>
}
