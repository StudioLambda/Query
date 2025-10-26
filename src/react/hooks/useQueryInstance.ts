import { type Query } from 'query:index'
import { useQueryContext } from 'query/react:hooks/useQueryContext'
import { useDebugValue, useMemo } from 'react'

export interface QueryInstance {
  readonly query?: Query
}

export function useQueryInstance(options?: QueryInstance): Query {
  useDebugValue('useQueryInstance')

  const { query: cQuery } = useQueryContext()
  const { query: oQuery } = options ?? {}

  return useMemo(
    function () {
      const instance = oQuery ?? cQuery

      if (!instance) {
        throw new Error(
          'No query instance was found. Please provide one via the resource options or the query context.'
        )
      }

      return instance
    },
    [oQuery, cQuery]
  )
}
