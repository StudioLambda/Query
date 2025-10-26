import { useEffect, useMemo, type ReactNode } from 'react'
import { Context, type ContextValue } from 'query/react:context'
import { createQuery, type Query } from 'query:index'

export interface QueryProviderProps extends ContextValue {
  children?: ReactNode
}

export function QueryProvider({
  children,
  clearOnForget,
  ignoreTransitionContext,
  query,
}: QueryProviderProps) {
  const localQuery = useMemo<Query>(
    function () {
      return query ?? createQuery()
    },
    [query]
  )

  useEffect(
    function () {
      const broadcast = new BroadcastChannel('query')

      localQuery.configure({ broadcast })

      const unsubscribe = localQuery.subscribeBroadcast()

      return function () {
        unsubscribe()
        broadcast.close()
      }
    },
    [localQuery]
  )

  const value = useMemo(
    function (): ContextValue {
      return { query: localQuery, clearOnForget, ignoreTransitionContext }
    },
    [localQuery, clearOnForget, ignoreTransitionContext]
  )

  return <Context value={value}>{children}</Context>
}
