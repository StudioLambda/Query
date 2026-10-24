import { TransitionContext } from 'query/react:transition'
import { type ReactNode, type TransitionStartFunction } from 'react'

/**
 * Props for the QueryTransition component, providing transition state
 * and control function to be shared with descendant query components.
 * Obtain both values from the same useTransition call for a coherent scope.
 *
 * @example
 * function Layout() {
 *   const [isPending, startTransition] = useTransition()
 *   const props: QueryTransitionProps = { isPending, startTransition, children: 'Application' }
 *   return <QueryTransition {...props} />
 * }
 * const view = <Layout />
 */
export interface QueryTransitionProps {
  /**
   * Indicates whether a transition is currently pending.
   * Use the state paired with startTransition, not a query cache status flag.
   *
   * @example
   * function Layout() {
   *   const [isPending, startTransition] = useTransition()
   *   return <QueryTransition isPending={isPending} startTransition={startTransition}>App</QueryTransition>
   * }
   * const view = <Layout />
   */
  readonly isPending: boolean

  /**
   * The function to start a transition, typically from useTransition.
   * Descendant query hooks use it unless ignoreTransitionContext is enabled.
   *
   * @example
   * function Layout() {
   *   const [isPending, startTransition] = useTransition()
   *   return <QueryTransition isPending={isPending} startTransition={startTransition}>App</QueryTransition>
   * }
   * const view = <Layout />
   */
  readonly startTransition: TransitionStartFunction

  /**
   * The child elements that will have access to the transition context.
   * This scope supplies transition values only, not a query or error boundary.
   *
   * @example
   * function Layout() {
   *   const [isPending, startTransition] = useTransition()
   *   return <QueryTransition isPending={isPending} startTransition={startTransition}>App</QueryTransition>
   * }
   * const view = <Layout />
   */
  readonly children?: ReactNode
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
 *       Application content
 *     </QueryTransition>
 *   )
 * }
 * const view = <App />
 * ```
 */
export function QueryTransition({ children, startTransition, isPending }: QueryTransitionProps) {
  const value = { startTransition, isPending }

  return <TransitionContext value={value}>{children}</TransitionContext>
}
