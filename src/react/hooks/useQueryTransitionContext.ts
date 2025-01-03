import { TransitionContext, type QueryTransitionContextValue } from 'query/react:transition'
import { use, useDebugValue } from 'react'

export function useQueryTransitionContext(): QueryTransitionContextValue {
  useDebugValue('useQueryTransitionContext')

  return use(TransitionContext)
}
