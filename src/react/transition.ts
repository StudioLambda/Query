import { createContext, type TransitionStartFunction } from 'react'

export interface QueryTransitionContextValue {
  readonly isPending?: boolean
  readonly startTransition?: TransitionStartFunction
}

export const TransitionContext = createContext<QueryTransitionContextValue>({
  isPending: undefined,
  startTransition: undefined,
})
