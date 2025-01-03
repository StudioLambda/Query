import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Context, ContextValue, type ContextOptions } from 'query/react:context'
import { createQuery, Query, type Configuration } from 'query:index'

type OtherProps = Configuration & ContextOptions

export interface QueryProviderProps extends OtherProps {
  children?: ReactNode
}

export function QueryProvider({
  children,
  clearOnForget,
  broadcast,
  ...options
}: QueryProviderProps) {
  function initial() {
    return createQuery({ broadcast, ...options })
  }

  const [query] = useState<Query>(initial)

  function reconfigure() {
    query.configure(options)
  }

  useEffect(reconfigure, [query, options])

  function broadcastCleanup() {
    if (broadcast) {
      query.configure({ broadcast })
      const unsubscribe = query.subscribeBroadcast()

      return function () {
        unsubscribe()
      }
    }

    const channel = new BroadcastChannel('query')

    query.configure({ broadcast: channel })
    const unsubscribe = query.subscribeBroadcast()

    return function () {
      unsubscribe()
      channel.close()
    }
  }

  useEffect(broadcastCleanup, [query, broadcast])

  function additionalHandler() {
    return { clearOnForget }
  }

  const additional = useMemo(additionalHandler, [clearOnForget])

  function valueHandler(): ContextValue {
    return { query, additional }
  }

  const value = useMemo(valueHandler, [query, additional])

  return <Context value={value}>{children}</Context>
}
