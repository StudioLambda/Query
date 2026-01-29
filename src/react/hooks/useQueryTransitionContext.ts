import { TransitionContext, type QueryTransitionContextValue } from 'query/react:transition'
import { use } from 'react'

/**
 * A React hook that retrieves the current transition context value from the
 * nearest QueryTransition ancestor. Provides access to the shared transition
 * state and startTransition function for coordinating UI updates across
 * multiple query components.
 *
 * @returns The current transition context value containing isPending state
 *          and startTransition function.
 *
 * @example
 * ```tsx
 * const { isPending, startTransition } = useQueryTransitionContext()
 * ```
 */
export function useQueryTransitionContext(): QueryTransitionContextValue {
  return use(TransitionContext)
}
