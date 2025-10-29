import { TransitionContext } from 'query/react:transition'
import { type ReactNode, type TransitionStartFunction } from 'react'

export interface QueryTransitionProps {
  isPending: boolean
  startTransition: TransitionStartFunction
  children?: ReactNode
}

export function QueryTransition({ children, startTransition, isPending }: QueryTransitionProps) {
  const value = { startTransition, isPending }

  return <TransitionContext value={value}>{children}</TransitionContext>
}
