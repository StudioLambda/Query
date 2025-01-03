import { createContext } from 'react'
import { Query } from 'query:index'

export interface ContextOptions {
  readonly clearOnForget?: boolean
  readonly ignoreTransitionContext?: boolean
}

export interface ContextValue {
  readonly query?: Query
  readonly additional?: ContextOptions
}

export const Context = createContext<ContextValue>({
  query: undefined,
  additional: undefined,
})
