import { TransitionContext, type QueryTransitionContextValue } from 'query/react:transition'
import { useMemo, type ReactNode, type TransitionStartFunction } from 'react'

export interface QueryTransitionProps {
  isPending: boolean
  startTransition: TransitionStartFunction
  children?: ReactNode
}

export function QueryTransition({ children, startTransition, isPending }: QueryTransitionProps) {
  const value = useMemo(
    function (): QueryTransitionContextValue {
      return { startTransition, isPending }
    },
    [startTransition, isPending]
  )

  return <TransitionContext value={value}>{children}</TransitionContext>
}
