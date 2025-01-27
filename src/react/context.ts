import { createContext } from 'react'
import { QueryInstance } from './hooks/useQueryInstance'

export interface ContextValue extends QueryInstance {
  readonly clearOnForget?: boolean
  readonly ignoreTransitionContext?: boolean
}

export const Context = createContext<ContextValue>({
  query: undefined,
  clearOnForget: undefined,
  ignoreTransitionContext: undefined,
})
