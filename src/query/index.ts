/**
 * Determines the shape of the Cache instance.
 */
export interface Cache<T = unknown> {
  /**
   * Gets an item from the cache.
   */
  readonly get: (key: string) => T | undefined

  /**
   * Sets an item to the cache.
   */
  readonly set: (key: string, value: T) => void

  /**
   * Removes a key-value pair from the cache.
   */
  readonly delete: (key: string) => void

  /**
   * Returns the current cached keys.
   */
  readonly keys: () => IterableIterator<string>
}

/**
 * Determines how we store items in the items cache.
 */
interface ItemsCacheItem<T = unknown> {
  /**
   * Stores the cache item.
   */
  readonly item: T

  /**
   * Determines the expiration date of the item.
   */
  readonly expiresAt: Date
}

/**
 * Determines how we store items in the resolvers cache.
 */
interface ResolversCacheItem<T = unknown> {
  /**
   * The resolvable item.
   */
  readonly item: Promise<T>

  /**
   * The abort controller for the request.
   */
  readonly controller: AbortController
}

/**
 * Represents the available configuration options
 * for a query instance.
 */
export interface Configuration extends Options {
  /**
   * Determines the resolved items cache to use.
   */
  readonly itemsCache?: Cache<ItemsCacheItem>

  /**
   * Determines the resolvers cache to use.
   */
  readonly resolversCache?: Cache<ResolversCacheItem>

  /**
   * Stores the event system.
   */
  readonly events?: EventTarget

  /**
   * Broadcast channel. This is useful for communicating
   * between tabs and windows (browser contexts).
   *
   * By default it does not use any broadcast channel.
   * If a broadcast channel is provided, query
   * won't close automatically, therefore, the responsability
   * of closing the broadcast channel is up to the user.
   */
  readonly broadcast?: BroadcastChannel
}

export interface FetcherAdditional {
  /**
   * An abort signal to cancel pending queries.
   */
  readonly signal: AbortSignal
}

/**
 * The available options for query.
 */
export interface Options<T = unknown> {
  /**
   * Determines the item deduplication interval.
   * This determines how many milliseconds an item
   * is considered valid.
   */
  readonly expiration?: ExpirationFunction<T>

  /**
   * Determines the fetcher function to use.
   */
  readonly fetcher?: FetcherFunction<T>

  /**
   * Determines if we can return a stale item.
   * If `true`, it will return the previous stale item
   * stored in the cache if it has expired. It will attempt
   * to revalidate it in the background. If `false`, the returned
   * promise will be the revalidation promise.
   */
  readonly stale?: boolean

  /**
   * Removes the stored item if there is an error in the request.
   * By default, we don't remove the item upon failure, only the resolver
   * is removed from the cache.
   */
  readonly removeOnError?: boolean

  /**
   * Determines if the result should be a fresh fetched
   * instance regardless of any cached value or its expiration time.
   */
  readonly fresh?: boolean
}

/**
 * Determines the cache type.
 */
export type CacheType = 'resolvers' | 'items'

/**
 * The mutation function type.
 */
export interface MutationFunction<T> {
  (previous?: T, expiresAt?: Date): T | Promise<T>
}

/**
 * The available mutation values.
 */
export type MutationValue<T> = T | MutationFunction<T>

/**
 * The function type for the event subscription.
 */
export interface SubscribeFunction {
  (key: string, event: QueryEvent, listener: EventListener): Unsubscriber
}

/**
 * The broadcast payload.
 */
export interface BroadcastPayload {
  /**
   * The event name.
   */
  readonly event: QueryEvent

  /**
   * The event detail.
   */
  readonly detail: unknown
}

/**
 * The function type for the broadcast subscription.
 */
export interface SubscribeBroadcastFunction {
  (): Unsubscriber
}

/**
 * The query function type.
 */
export interface QueryFunction {
  <T = unknown>(key: string, options?: Options<T>): Promise<T>
}

export interface ExpirationFunction<T = unknown> {
  (item: T): number
}

export interface FetcherFunction<T = unknown> {
  (key: string, additional: FetcherAdditional): Promise<T>
}

/**
 * The mutate function options.
 */
export interface HydrateOptions<T = unknown> {
  expiration?: ExpirationFunction<T>
}

/**
 * The mutate function options.
 */
export interface MutateOptions<T = unknown> {
  expiration?: ExpirationFunction<T>
}

/**
 * The mutate function type.
 */
export interface MutateFunction {
  <T = unknown>(key: string, item: MutationValue<T>, options?: MutateOptions<T>): Promise<T>
}

/**
 * The hydrate function type.
 */
export interface HydrateFunction {
  <T = unknown>(keys: string | string[], item: T, options?: HydrateOptions<T>): void
}

/**
 * The unsubscriber function.
 */
export type Unsubscriber = () => void

/**
 * The caches available on the query.
 */
export interface Caches {
  /**
   * A cache that contains the resolved items alongside
   * their expiration time.
   */
  readonly items: Cache<ItemsCacheItem>

  /**
   * A cache that contains the resolvers alongside
   * their abort controllers.
   */
  readonly resolvers: Cache<ResolversCacheItem>
}

/**
 * Represents the methods a query
 * should implement.
 */
export interface Query {
  /**
   * Configures the current instance of query.
   */
  readonly configure: (options?: Partial<Configuration>) => void

  /**
   * Fetches the key information using a fetcher.
   * The returned promise contains the result item.
   */
  readonly query: QueryFunction

  /**
   * Subscribes to a given event & key. The event handler
   * does have a payload parameter that will contain relevant
   * information depending on the event type.
   */
  readonly subscribe: SubscribeFunction

  /**
   * Subscribes to the broadcast channel
   * to listen for other browser context
   * events and reproduce them in the current
   * context.
   */
  readonly subscribeBroadcast: SubscribeBroadcastFunction

  /**
   * Mutates the key with a given optimistic value.
   * The mutated value is considered expired and will be
   * replaced immediatly if a refetch happens.
   */
  readonly mutate: MutateFunction

  /**
   * Aborts the active resolvers on each key
   * by calling `.abort()` on the `AbortController`.
   * The fetcher is responsible for using the
   * `AbortSignal` to cancel the job.
   */
  readonly abort: (key?: string | string[], reason?: unknown) => void

  /**
   * Forgets the given keys from the cache.
   * Removes items from both, the cache and resolvers.
   */
  readonly forget: (keys?: string | string[] | RegExp) => void

  /**
   * Hydrates the given keys on the cache
   * with the given value and expiration time.
   */
  readonly hydrate: HydrateFunction

  /**
   * Returns the given keys for the given cache.
   */
  readonly keys: (cache?: CacheType) => string[]

  /**
   * Returns the expiration date of a given key item.
   * If the item is not in the cache, it will return `undefined`.
   */
  readonly expiration: (key: string) => Date | undefined

  /**
   * Returns the current snapshot of the given key.
   * If the item is not in the items cache, it will return `undefined`.
   */
  readonly snapshot: <T = unknown>(key: string) => T | undefined

  // Returns the first event on the given key that happens.
  //
  // It does so by subscribing and unsubscribing after event has
  // been emitted.
  readonly once: (key: string, event: QueryEvent) => Promise<Event>

  // A generator that is able to stream events as they come in.
  readonly stream: (key: string, event: QueryEvent) => AsyncGenerator<Event>

  /**
   * Returns the current cache instances in use.
   */
  readonly caches: () => Caches

  /**
   * Returns the event system in use.
   */
  readonly events: () => EventTarget

  /**
   * Returns the broadcast channel in use.
   */
  readonly broadcast: () => BroadcastChannel | undefined
}

/**
 * Available events on query.
 */
export type QueryEvent =
  | 'refetching'
  | 'resolved'
  | 'mutating'
  | 'mutated'
  | 'aborted'
  | 'forgotten'
  | 'hydrated'
  | 'error'

/**
 * Stores the default fetcher function.
 */
export function defaultFetcher<T>(
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
): FetcherFunction<T> {
  return async function (key: string, { signal }: FetcherAdditional): Promise<T> {
    const response = await fetch(key, { signal })

    if (!response.ok) {
      throw new Error('Unable to fetch the data: ' + response.statusText)
    }

    return (await response.json()) as T
  }
}

/**
 * Creates a new query instance.
 */
export function createQuery(instanceOptions?: Configuration): Query {
  /**
   * Stores the default expiration function.
   */
  function defaultExpiration() {
    return 2000
  }

  /**
   * Stores the items cache.
   */
  let itemsCache = instanceOptions?.itemsCache ?? new Map<string, ItemsCacheItem>()

  /**
   * Stores the resolvers cache.
   */
  let resolversCache = instanceOptions?.resolversCache ?? new Map<string, ResolversCacheItem>()

  /**
   * Event manager.
   */
  let events = instanceOptions?.events ?? new EventTarget()

  /**
   * Broadcast channel. This is useful for communicating
   * between tabs and windows (browser contexts).
   *
   * By default it does not use any broadcast channel.
   * If a broadcast channel is provided, query
   * won't close automatically, therefore, the responsability
   * of closing the broadcast channel is up to the user.
   */
  let broadcast = instanceOptions?.broadcast

  /**
   * Stores the expiration time of an item.
   */
  let instanceExpiration = instanceOptions?.expiration ?? defaultExpiration

  /**
   * Determines the fetcher function to use.
   */
  let instanceFetcher = instanceOptions?.fetcher ?? defaultFetcher(fetch)

  /**
   * Determines if we can return a stale item.
   * If `true`, it will return the previous stale item
   * stored in the cache if it has expired. It will attempt
   * to revalidate it in the background. If `false`, the returned
   * promise will be the revalidation promise.
   */
  let instanceStale = instanceOptions?.stale ?? true

  /**
   * Removes the stored item if there is an error in the request.
   * By default, we don't remove the item upon failure, only the resolver
   * is removed from the cache.
   */
  let instanceRemoveOnError = instanceOptions?.removeOnError ?? false

  /**
   * Determines if the result should be a fresh fetched
   * instance regardless of any cached value or its expiration time.
   */
  let instanceFresh = instanceOptions?.fresh ?? false

  /**
   * Configures the current instance of query.
   */
  function configure(options?: Configuration): void {
    itemsCache = options?.itemsCache ?? itemsCache
    resolversCache = options?.resolversCache ?? resolversCache
    events = options?.events ?? events
    broadcast = options?.broadcast ?? broadcast
    instanceExpiration = options?.expiration ?? instanceExpiration
    instanceFetcher = options?.fetcher ?? instanceFetcher
    instanceStale = options?.stale ?? instanceStale
    instanceRemoveOnError = options?.removeOnError ?? instanceRemoveOnError
    instanceFresh = options?.fresh ?? instanceFresh
  }

  /**
   * Subscribes to a given keyed event. The event handler
   * does have a payload parameter that will contain relevant
   * information depending on the event type.
   * If there's a pending resolver for that key, the `refetching`
   * event is fired immediatly.
   */
  function subscribe(key: string, event: QueryEvent, listener: EventListener): Unsubscriber {
    events.addEventListener(`${event}:${key}`, listener)
    const value = resolversCache.get(key)

    // For the refetching event, we want to immediatly return if there's
    // a pending resolver.
    if (event === 'refetching' && value !== undefined) {
      listener(new CustomEvent(`${event}:${key}`, { detail: value.item }))
    }

    return function () {
      events.removeEventListener(`${event}:${key}`, listener)
    }
  }

  /**
   * Mutates the key with a given optimistic value.
   * The mutated value is considered expired and will be
   * replaced immediatly if a refetch happens when expired
   * is true. If expired is false, the value expiration time
   * is added as if it was a valid data refetched. Alternatively
   * you can provide a Date to decide when the expiration happens.
   */
  async function mutate<T = unknown>(
    key: string,
    resolver: MutationValue<T>,
    options?: MutateOptions<T>
  ): Promise<T> {
    async function action(resolver: MutationValue<T>) {
      if (typeof resolver === 'function') {
        const fn = resolver as MutationFunction<T>
        const value = itemsCache.get(key)

        resolver = await fn(value?.item as T, value?.expiresAt)
      }

      const expiresAt = new Date()

      expiresAt.setMilliseconds(
        expiresAt.getMilliseconds() + (options?.expiration?.(resolver) ?? 0)
      )

      itemsCache.set(key, { item: resolver, expiresAt: expiresAt })

      return resolver
    }

    const result = action(resolver)

    events.dispatchEvent(new CustomEvent(`mutating:${key}`, { detail: result }))

    const item = await result

    events.dispatchEvent(new CustomEvent(`mutated:${key}`, { detail: item }))
    broadcast?.postMessage({ event: `mutated:${key}`, detail: item })

    return item
  }

  /**
   * Returns the current snapshot of the given key.
   * If the item is not in the items cache, it will return `undefined`.
   */
  function snapshot<T = unknown>(key: string): T | undefined {
    return itemsCache.get(key)?.item as T
  }

  /**
   * Determines if the given key is currently resolving.
   */
  function keys(type: CacheType = 'items'): string[] {
    return Array.from(type === 'items' ? itemsCache.keys() : resolversCache.keys())
  }

  /**
   * Aborts the active resolvers on each key
   * by calling `.abort()` on the `AbortController`.
   * The fetcher is responsible for using the
   * `AbortSignal` to cancel the job.
   * If no keys are provided, all resolvers are aborted.
   */
  function abort(cacheKeys?: string | string[], reason?: unknown): void {
    const resolverKeys =
      typeof cacheKeys === 'string' ? [cacheKeys] : (cacheKeys ?? keys('resolvers'))

    for (const key of resolverKeys) {
      const resolver = resolversCache.get(key)

      if (resolver !== undefined) {
        resolver.controller.abort(reason)
        resolversCache.delete(key)

        events.dispatchEvent(new CustomEvent(`aborted:${key}`, { detail: reason }))
        broadcast?.postMessage({ event: `aborted:${key}`, detail: reason })
      }
    }
  }

  /**
   * Forgets the given keys from the items cache.
   * Does not remove any resolvers.
   * If no keys are provided the items cache is cleared.
   */
  function forget(cacheKeys?: string | string[] | RegExp): void {
    let itemKeys: string[]

    if (typeof cacheKeys === 'string') {
      itemKeys = [cacheKeys]
    } else if (Array.isArray(cacheKeys)) {
      itemKeys = cacheKeys
    } else if (cacheKeys instanceof RegExp) {
      itemKeys = keys('items').filter((key) => key.match(cacheKeys))
    } else {
      itemKeys = keys('items')
    }

    for (const key of itemKeys) {
      const item = itemsCache.get(key)

      if (item !== undefined) {
        itemsCache.delete(key)
        events.dispatchEvent(new CustomEvent(`forgotten:${key}`, { detail: item.item }))
        broadcast?.postMessage({ event: `forgotten:${key}`, detail: item.item })
      }
    }
  }

  /**
   * Hydrates the given keys on the cache
   * with the given value. Hydrate should only
   * be used when you want to populate the cache.
   * Please use mutate() in most cases unless you
   * know what you are doing.
   */
  function hydrate<T = unknown>(
    keys: string | string[],
    item: T,
    options?: HydrateOptions<T>
  ): void {
    const expiresAt = new Date()
    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (options?.expiration?.(item) ?? 0))

    for (const key of typeof keys === 'string' ? [keys] : keys) {
      itemsCache.set(key, { item, expiresAt: expiresAt })
      events.dispatchEvent(new CustomEvent(`hydrated:${key}`, { detail: item }))
      broadcast?.postMessage({ event: `hydrated:${key}`, detail: item })
    }
  }

  /**
   * Returns the expiration date of a given key item.
   * If the item is not in the cache, it will return `undefined`.
   */
  function expiration(key: string): Date | undefined {
    return itemsCache.get(key)?.expiresAt
  }

  /**
   * Fetches the key information using a fetcher.
   * The returned promise contains the result item.
   */
  async function query<T = unknown>(key: string, options?: Options<T>): Promise<T> {
    /**
     * Stores the expiration time of an item.
     */
    const expiration = options?.expiration ?? instanceExpiration

    /**
     * Determines the fetcher function to use.
     */
    const fetcher = (options?.fetcher ?? instanceFetcher) as FetcherFunction<T>

    /**
     * Determines if we can return a sale item
     * If true, it will return the previous stale item
     * stored in the cache if it has expired. It will attempt
     * to revalidate it in the background. If false, the returned
     * promise will be the revalidation promise.
     */
    const stale = options?.stale ?? instanceStale

    /**
     * Removes the stored item if there is an error in the request.
     * By default, we don't remove the item upon failure, only the resolver
     * is removed from the cache.
     */
    const removeOnError = options?.removeOnError ?? instanceRemoveOnError

    /**
     * Determines if the result should be a fresh fetched
     * instance regardless of any cached value or its expiration time.
     */
    const fresh = options?.fresh ?? instanceOptions?.fresh

    // Force fetching of the data.
    async function refetch(key: string): Promise<T> {
      try {
        // Check if there's a pending resolver for that data.
        const pending = resolversCache.get(key)

        if (pending !== undefined) {
          return await (pending.item as Promise<T>)
        }

        // Create the abort controller that will be
        // called when a query is aborted.
        const controller = new AbortController()

        // Initiate the fetching request.
        async function action() {
          const result = fetcher(key, { signal: controller.signal })

          // Awaits the fetching to get the result item.
          const item = await result

          // Removes the resolver from the cache.
          resolversCache.delete(key)

          // Create the expiration time for the item.
          const expiresAt = new Date()
          expiresAt.setMilliseconds(expiresAt.getMilliseconds() + expiration(item))

          // Set the item to the cache.
          itemsCache.set(key, { item, expiresAt })

          return item
        }

        const result = action()

        // Adds the resolver to the cache.
        resolversCache.set(key, { item: result, controller })
        events.dispatchEvent(new CustomEvent(`refetching:${key}`, { detail: result }))

        const item = await result

        // Notify of the resolved item.
        events.dispatchEvent(new CustomEvent(`resolved:${key}`, { detail: item }))
        broadcast?.postMessage({ event: `resolved:${key}`, detail: item })

        // Return back the item.
        return item
      } catch (error) {
        // Remove the resolver.
        resolversCache.delete(key)

        // Check if the item should be removed as well.
        if (removeOnError) {
          itemsCache.delete(key)
        }

        // Notify of the error.
        events.dispatchEvent(new CustomEvent(`error:${key}`, { detail: error }))
        broadcast?.postMessage({ event: `error:${key}`, detail: error })

        // Throw back the error.
        throw error
      }
    }

    // We want to force a fresh item ignoring any current cached
    // value or its expiration time.
    if (fresh) {
      return await refetch(key)
    }

    // Check if there's an item in the cache for the given key.
    const cached = itemsCache.get(key)

    if (cached !== undefined) {
      // We must check if that item has actually expired.
      // to trigger a revalidation if needed.
      const hasExpired = cached.expiresAt <= new Date()

      // The item has expired and the fetch is able
      // to return a stale item while revalidating
      // in the background.
      if (hasExpired && stale) {
        // We have to silence the error to avoid unhandled promises.
        // Refer to the error event if you need full controll of errors.
        refetch(key).catch(() => {})

        return cached.item as T
      }

      // The item has expired but we dont allow stale
      // responses so we need to wait for the revalidation.
      if (hasExpired) {
        return await refetch(key)
      }

      // The item has not yet expired, so we can return it and
      // assume it's valid since it's not yet considered stale.
      return cached.item as T
    }

    // The item is not found in the items cache.
    // We need to perform a revalidation of the item.
    return await refetch(key)
  }

  /**
   * Returns the current cache instances.
   */
  function caches(): Caches {
    return { items: itemsCache, resolvers: resolversCache }
  }

  /**
   * Returns the event system.
   */
  function localEvents() {
    return events
  }

  /**
   * Returns the broadcast channel.
   */
  function localBroadcast() {
    return broadcast
  }

  /**
   * Subscribes to the broadcast channel
   * to listen for other browser context
   * events and reproduce them in the current
   * context.
   */
  function subscribeBroadcast(): Unsubscriber {
    function onBroadcastMessage(message: MessageEvent<BroadcastPayload>) {
      events.dispatchEvent(new CustomEvent(message.data.event, { detail: message.data.detail }))
    }

    broadcast?.addEventListener('message', onBroadcastMessage)

    return function () {
      broadcast?.removeEventListener('message', onBroadcastMessage)
    }
  }

  async function once(key: string, event: QueryEvent): Promise<Event> {
    return new Promise<Event>(function (resolve) {
      const unsubscribe = subscribe(key, event, function (event) {
        resolve(event)
        unsubscribe()
      })
    })
  }

  async function* stream(key: string, event: QueryEvent) {
    for (;;) {
      yield await once(key, event)
    }
  }

  return {
    query,
    subscribe,
    subscribeBroadcast,
    mutate,
    configure,
    abort,
    forget,
    keys,
    expiration,
    hydrate,
    snapshot,
    once,
    stream,
    caches,
    events: localEvents,
    broadcast: localBroadcast,
  }
}
