import { useEffect, type ReactNode } from 'react'
import { Context, type ContextValue } from 'query/react:context'
import { createQuery } from 'query:index'

export interface QueryProviderProps extends ContextValue {
  children?: ReactNode
}

export function QueryProvider({
  children,
  clearOnForget,
  ignoreTransitionContext,
  query,
}: QueryProviderProps) {
  const localQuery = query ?? createQuery()

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

  const value = { query: localQuery, clearOnForget, ignoreTransitionContext }

  return <Context value={value}>{children}</Context>
}
