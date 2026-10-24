import { useEffect, type ReactNode } from 'react'
import { Context, type ContextValue } from 'query/react:context'
import { createQuery, type Query, type Unsubscriber } from 'query:index'

/**
 * Tracks the providers using one query's incoming broadcast subscription.
 * The last provider removes the listener, but never closes the channel.
 */
interface ProviderSubscription {
  /**
   * Counts mounted provider effects, not renders. Reaching zero releases
   * the listener so StrictMode remounts can acquire a fresh subscription.
   */
  providers: number
  /**
   * Removes the core listener from its captured channel without closing it.
   * Called only after the final provider releases this subscription.
   */
  readonly unsubscribe: Unsubscriber
}

/**
 * Shares incoming listeners between providers using the same query, avoiding
 * duplicate event delivery. Weak keys do not retain unused query instances.
 */
const subscriptions = new WeakMap<Query, ProviderSubscription>()

/**
 * Acquires one provider's interest in a query's configured channel.
 * Cleanup releases only this interest; other providers keep receiving events.
 * No channel is created, configured, or closed here. With no configured
 * channel, the core subscription and its cleanup are harmless no-ops.
 */
function subscribeProviderBroadcast(query: Query): Unsubscriber {
  /**
   * Retain the shared record rather than copying it so every cleanup observes
   * the same provider count, regardless of the order providers unmount.
   */
  const subscription = subscriptions.get(query) ?? {
    providers: 0,
    unsubscribe: query.subscribeBroadcast(),
  }
  subscriptions.set(query, subscription)
  subscription.providers += 1

  return function () {
    subscription.providers -= 1
    if (subscription.providers === 0) {
      subscription.unsubscribe()
      subscriptions.delete(query)
    }
  }
}

/**
 * Props for the QueryProvider component, extending the context value
 * configuration with optional children. Broadcast channels, when needed,
 * belong to the supplied query rather than to the provider.
 *
 * @example
 * ```tsx
 * const props: QueryProviderProps = { query: createQuery(), children: 'Ready' }
 * const provider = <QueryProvider {...props} />
 * ```
 */
export interface QueryProviderProps extends ContextValue {
  /**
   * The child elements to render within the provider context.
   */
  children?: ReactNode
}

/**
 * A React component that provides query context to its descendants.
 * Creates a query instance if not provided and makes it available to child
 * components via React context. Cross-tab synchronization is disabled by
 * default. To opt in, supply a query created with an explicitly scoped
 * `broadcast` channel. The caller must close that channel after all users
 * are done; provider cleanup only removes its incoming subscription.
 * Multiple providers sharing a query share one incoming listener.
 *
 * @param props - The provider configuration and children.
 *
 * @example
 * ```tsx
 * import { createQuery } from '@studiolambda/query'
 * import { QueryProvider } from '@studiolambda/query/react'
 *
 * const query = createQuery()
 *
 * function App() {
 *   return (
 *     <QueryProvider query={query} clearOnForget>
 *       Application content
 *     </QueryProvider>
 *   )
 * }
 * ```
 */
export function QueryProvider({
  children,
  clearOnForget,
  ignoreTransitionContext,
  query,
}: QueryProviderProps) {
  const localQuery = query ?? createQuery()

  useEffect(
    function () {
      return subscribeProviderBroadcast(localQuery)
    },
    [localQuery]
  )

  const value = { query: localQuery, clearOnForget, ignoreTransitionContext }

  return <Context value={value}>{children}</Context>
}
