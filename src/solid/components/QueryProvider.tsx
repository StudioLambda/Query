import { createMemo, onCleanup, createSignal, JSX, createEffect } from 'solid-js'

import { QueryContext, type QueryContextOptions } from 'query/solid:context'
import { createQuery, Query, type Configuration } from 'query:index'

type Options = Configuration & QueryContextOptions

export interface QueryProps extends Options {
  children?: JSX.Element
}

export function QueryProvider(props: QueryProps) {
  const [localBroadcast, setLocalbroadcast] = createSignal<BroadcastChannel>()

  createEffect(function () {
    if (props.broadcast) {
      setLocalbroadcast(props.broadcast)

      return
    }

    const channel = new BroadcastChannel('query')

    setLocalbroadcast(channel)

    onCleanup(function () {
      channel.close()
    })
  })

  const query = createMemo<Query>(function () {
    return createQuery({ ...props, broadcast: localBroadcast() })
  })

  const additional = createMemo(function () {
    return { clearOnForget: props.clearOnForget }
  })

  createEffect(function () {
    const unsubscribe = query().subscribeBroadcast()

    onCleanup(function () {
      unsubscribe()
    })
  })

  return (
    <QueryContext.Provider value={{ query, additional }}>{props.children}</QueryContext.Provider>
  )
}
