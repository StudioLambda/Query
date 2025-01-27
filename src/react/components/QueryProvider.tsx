import { useEffect, useMemo, type ReactNode } from 'react'
import { Context, ContextValue } from 'query/react:context'
import { createQuery, Query } from 'query:index'

export interface QueryProviderProps extends ContextValue {
  children?: ReactNode
}

export function QueryProvider({
  children,
  clearOnForget,
  ignoreTransitionContext,
  query,
}: QueryProviderProps) {
  function queryInstance() {
    return query ?? createQuery()
  }

  const localQuery = useMemo<Query>(queryInstance, [query])

  function broadcastCleanup() {
    if (localQuery.broadcast()) {
      const unsubscribe = localQuery.subscribeBroadcast()

      return function () {
        unsubscribe()
      }
    }

    const channel = new BroadcastChannel('query')

    localQuery.configure({ broadcast: channel })
    const unsubscribe = localQuery.subscribeBroadcast()

    return function () {
      unsubscribe()
      channel.close()
    }
  }

  useEffect(broadcastCleanup, [localQuery])

  function valueHandler(): ContextValue {
    return { query, clearOnForget, ignoreTransitionContext }
  }

  const value = useMemo(valueHandler, [query, clearOnForget, ignoreTransitionContext])

  return <Context value={value}>{children}</Context>
}
