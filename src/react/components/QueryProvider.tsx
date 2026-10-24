import { useEffect, type ReactNode } from 'react'
import { Context, type ContextValue } from 'query/react:context'
import { createQuery, type Query, type Unsubscriber } from 'query:index'

/**
 * Tracks the providers using one query's incoming broadcast subscription.
 * The last provider removes the listener, but never closes the channel.
 * The record is shared by identity so unmount order does not affect cleanup.
 *
 * @example
 * const record: ProviderSubscription = { providers: 1, unsubscribe: () => {} }
 * record.unsubscribe() // Called by the provider when its count reaches zero.
 */
interface ProviderSubscription {
  /**
   * Counts mounted provider effects, not renders. Reaching zero releases
   * the listener so StrictMode remounts can acquire a fresh subscription.
   *
   * @example
   * const record: ProviderSubscription = { providers: 1, unsubscribe: () => {} }
   * record.providers -= 1
   */
  providers: number
  /**
   * Removes the core listener from its captured channel without closing it.
   * Called only after the final provider releases this subscription.
   *
   * @example
   * const record: ProviderSubscription = { providers: 0, unsubscribe: () => {} }
   * record.unsubscribe()
   */
  readonly unsubscribe: Unsubscriber
}

/**
 * Shares incoming listeners between providers using the same query, avoiding
 * duplicate event delivery. Weak keys do not retain unused query instances.
 * Listener ownership counts committed effects only, never suspended renders.
 *
 * @example
 * const query = createQuery()
 * const view = <><QueryProvider query={query}>One</QueryProvider>
 *   <QueryProvider query={query}>Two</QueryProvider></>
 */
const subscriptions = new WeakMap<Query, ProviderSubscription>()

/**
 * Acquires one provider's interest in a query's configured channel.
 * Cleanup releases only this interest; other providers keep receiving events.
 * No channel is created, configured, or closed here. With no configured
 * channel, the core subscription and its cleanup are harmless no-ops.
 *
 * @example
 * const release = subscribeProviderBroadcast(createQuery())
 * release() // Releases one provider, not the caller-owned channel.
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
   * They inherit this query and policy; the provider adds no loading boundary.
   *
   * @example
   * const view = <QueryProvider query={createQuery()}>Application</QueryProvider>
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
 * Incoming listeners are acquired in client effects, never during SSR.
 * Pass a stable instance when cache ownership must outlive this provider.
 * The source creates its fallback instance in render; the published TSX build
 * can memoize that creation through React Compiler. Provider teardown does
 * not abort requests or close caller-owned resources.
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
