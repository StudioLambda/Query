import { useStableKeys } from 'query/react:_internal'
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

  const stableKeys = useStableKeys(keys)

  function tagsHandler() {
    return stableKeys.map((key) => <link rel="preload" href={key} as="fetch" {...options} />)
  }

  const tags = useMemo(tagsHandler, [stableKeys, options])

  return (
    <>
      {tags}
      {children}
    </>
  )
}
