import { TransitionContext, type QueryTransitionContextValue } from 'query/react:transition'
import { use } from 'react'

/**
 * A React hook that retrieves the current transition context value from the
 * nearest QueryTransition ancestor. Provides access to the shared transition
 * state and startTransition function for coordinating UI updates across
 * multiple query components.
 * Without a provider both members are undefined, allowing data hooks to
 * choose their local transition instead of requiring a shared scope.
 *
 * @returns The current transition context value containing isPending state
 *          and startTransition function.
 *
 * @example
 * ```tsx
 * function Progress() {
 *   const { isPending } = useQueryTransitionContext()
 *   return <span aria-busy={isPending}>Status</span>
 * }
 * function Layout() {
 *   const [isPending, startTransition] = useTransition()
 *   return <QueryTransition isPending={isPending} startTransition={startTransition}>
 *     <Progress />
 *   </QueryTransition>
 * }
 * const view = <Layout />
 * ```
 */
export function useQueryTransitionContext(): QueryTransitionContextValue {
  return use(TransitionContext)
}
