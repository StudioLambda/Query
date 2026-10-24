import { createMemo, onCleanup, createSignal, type JSX, createEffect } from 'solid-js'

import { QueryContext, type QueryContextOptions } from 'query/solid:context'
import { createQuery, type Query, type Configuration } from 'query:index'

/**
 * Combined configuration type that merges query configuration options
 * with context-specific options for the QueryProvider component.
 * This source-only intersection does not add an npm-exported Solid API.
 *
 * @example
 * const options: Options = { fetcher: async () => 'Ada', clearOnForget: true }
 * const view = <QueryProvider {...options}>Application</QueryProvider>
 */
type Options = Configuration & QueryContextOptions

/**
 * Props for the Solid.js QueryProvider component, extending all
 * query configuration and context options with optional children.
 * Unlike the React provider, this source-only provider creates its own query
 * and has no query-instance prop. Supplied broadcast channels are caller-owned.
 *
 * @example
 * const props: QueryProps = { fetcher: async () => 'Ada', children: 'Application' }
 * const view = <QueryProvider {...props} />
 */
export interface QueryProps extends Options {
  /**
   * The child elements to render within the provider context.
   * Children receive reactive context accessors, not a loading boundary.
   *
   * @example
   * const view = <QueryProvider fetcher={async () => 'Ada'}>Application</QueryProvider>
   */
  children?: JSX.Element
}

/**
 * A Solid.js component that provides query context to its descendants.
 * Creates a query instance with the provided configuration, sets up a
 * BroadcastChannel for cross-tab synchronization, and makes the query
 * available to all child components via Solid.js context.
 * This binding is unfinished and unpublished: import it from repository source
 * only. In client effects it uses a supplied caller-owned channel or creates
 * a channel named "query", which it closes on cleanup. That default differs
 * from the opt-in React/core policy and is unsuitable for tenant isolation.
 * Prefer an explicitly scoped channel; its name is not authorization.
 * Reactive configuration can replace the query instance. The provider does
 * not abort old requests or close a supplied channel on replacement/unmount.
 *
 * @param props - The provider configuration and children.
 *
 * @example
 * ```tsx
 * // Repository source example; this npm subpath is not published.
 * import { QueryProvider } from 'query/solid:components/QueryProvider'
 *
 * function App() {
 *   return (
 *     <QueryProvider fetcher={async () => 'Ada'}>
 *       Application content
 *     </QueryProvider>
 *   )
 * }
 * const view = <App />
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
