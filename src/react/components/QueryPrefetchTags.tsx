import type { QueryInstance } from 'query/react:hooks/useQueryInstance'
import { useQueryPrefetch } from 'query/react:hooks/useQueryPrefetch'
import { ReactNode, useMemo, LinkHTMLAttributes } from 'react'

type Additional = LinkHTMLAttributes<HTMLLinkElement> & QueryInstance

export interface QueryPrefetchTagsProps extends Additional {
  keys: string[]
  children?: ReactNode
}

export function QueryPrefetchTags({ keys, children, ...options }: QueryPrefetchTagsProps) {
  useQueryPrefetch(keys, options)

  const tags = useMemo(
    function () {
      return keys.map((key) => <link rel="preload" href={key} as="fetch" {...options} />)
    },
    [keys, options]
  )

  return (
    <>
      {tags}
      {children}
    </>
  )
}
