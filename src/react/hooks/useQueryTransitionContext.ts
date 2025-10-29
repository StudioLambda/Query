import { TransitionContext, type QueryTransitionContextValue } from 'query/react:transition'
import { use } from 'react'

export function useQueryTransitionContext(): QueryTransitionContextValue {
  return use(TransitionContext)
}
