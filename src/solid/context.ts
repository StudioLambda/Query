import { Accessor, createContext } from 'solid-js'
import { Query } from 'query:index'

export interface QueryContextOptions {
  readonly clearOnForget?: boolean
}

export interface QueryContextValue {
  readonly query?: Accessor<Query>
  readonly additional?: Accessor<QueryContextOptions>
}

export const QueryContext = createContext<QueryContextValue>({
  query: undefined,
  additional: undefined,
})
