import { createMemo, onCleanup, createSignal, type JSX, createEffect } from 'solid-js'

import { QueryContext, type QueryContextOptions } from 'query/solid:context'
import { createQuery, type Query, type Configuration } from 'query:index'

/**
 * Combined configuration type that merges query configuration options
 * with context-specific options for the QueryProvider component.
 */
type Options = Configuration & QueryContextOptions

/**
 * Props for the Solid.js QueryProvider component, extending all
 * query configuration and context options with optional children.
 */
export interface QueryProps extends Options {
  /**
   * The child elements to render within the provider context.
   */
  children?: JSX.Element
}

/**
 * A Solid.js component that provides query context to its descendants.
 * Creates a query instance with the provided configuration, sets up a
 * BroadcastChannel for cross-tab synchronization, and makes the query
 * available to all child components via Solid.js context.
 *
 * @param props - The provider configuration and children.
 *
 * @example
 * ```tsx
 * import { QueryProvider } from '@studiolambda/query/solid'
 *
 * function App() {
 *   return (
 *     <QueryProvider fetcher={customFetcher} clearOnForget>
 *       <MyComponents />
 *     </QueryProvider>
 *   )
 * }
 * ```
 */
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
