import { TransitionContext, QueryTransitionContextValue } from 'query/react:transition'
import { useMemo, type ReactNode, type TransitionStartFunction } from 'react'

export interface QueryTransitionProps {
  isPending: boolean
  startTransition: TransitionStartFunction
  children?: ReactNode
}

export function QueryTransition({ children, startTransition, isPending }: QueryTransitionProps) {
  function valueHandler(): QueryTransitionContextValue {
    return { startTransition, isPending }
  }

  const value = useMemo(valueHandler, [startTransition, isPending])

  return <TransitionContext value={value}>{children}</TransitionContext>
}
