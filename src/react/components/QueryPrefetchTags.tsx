import type { QueryInstance } from 'query/react:hooks/useQueryInstance'
import type { ReactNode, LinkHTMLAttributes } from 'react'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'

type Additional = LinkHTMLAttributes<HTMLLinkElement> & QueryInstance

export interface QueryPrefetchTagsProps extends Additional {
  keys: string[]
  children?: ReactNode
}

export function QueryPrefetchTags({ keys, children, ...options }: QueryPrefetchTagsProps) {
  useQueryPrefetch(keys, options)

  const tags = keys.map((key) => <link rel="preload" href={key} as="fetch" {...options} />)

  return (
    <>
      {tags}
      {children}
    </>
  )
}
