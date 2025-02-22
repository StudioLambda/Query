import type { QueryInstance } from 'query/react:hooks/useQueryInstance'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'
import { ReactNode } from 'react'

export interface QueryPrefetchProps extends QueryInstance {
  keys: string[]
  children?: ReactNode
}

export function QueryPrefetch({ keys, query, children }: QueryPrefetchProps) {
  useQueryPrefetch(keys, { query })

  return children
}
