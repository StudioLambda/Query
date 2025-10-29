import { type Query } from 'query:index'
import { useQueryContext } from 'query/react:hooks/useQueryContext'

export interface QueryInstance {
  readonly query?: Query
}

export const ErrNoQueryInstanceFound =
  'No query instance was found. Please provide one via the resource options or the query context.'

export function useQueryInstance(options?: QueryInstance): Query {
  const { query: cQuery } = useQueryContext()
  const { query: oQuery } = options ?? {}
  const instance = oQuery ?? cQuery

  if (!instance) {
    throw new Error(ErrNoQueryInstanceFound)
  }

  return instance
}
