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
  readonly item: Promise<T>

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
export type MutationFunction<T> = {
  (previous?: T, expiresAt?: Date): T | Promise<T>
}

/**
 * The available mutation values.
 */
export type MutationValue<T> = T | MutationFunction<T>

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
export type SubscribeBroadcastFunction = {
  (): Unsubscriber
}

/**
 * The query function type.
 */
export type QueryFunction = {
  <T = unknown>(key: string, options?: Options<T>): Promise<T>
}

export type ExpirationFunction<T = unknown> = {
  (item: T): number
}

export type FetcherFunction<T = unknown> = {
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
export type MutateFunction = {
  <T = unknown>(key: string, item: MutationValue<T>, options?: MutateOptions<T>): Promise<T>
}

/**
 * The hydrate function type.
 */
export type HydrateFunction = {
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

export type OnceFunction = {
  <T = unknown>(key: string, event: QueryEvent): Promise<CustomEventInit<T>>
}

export type StreamFunction = {
  <T = unknown>(key: string, event: QueryEvent): AsyncGenerator<CustomEventInit<T>>
}

export type ConfigureFunction = {
  (options?: Partial<Configuration>): void
}

/**
 * Represents the methods a query
 * should implement.
 */
export interface Query {
  /**
   * Configures the current instance of query.
   */
  readonly configure: ConfigureFunction

  /**
   * Fetches the key information using a fetcher.
   * The returned promise contains the result item.
   */
  readonly query: QueryFunction

  /**
   * Emit is able to send events to active subscribers
   * with the given payload. It is a low level API
   * and should be used with case.
   */
  readonly emit: EmitFunction

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
  readonly forget: (keys?: string | string[] | RegExp) => Promise<void>

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

  /**
   * Returns the first event on the given key that happens.
   *
   * It does so by subscribing and unsubscribing after event has
   * been emitted.
   */
  readonly once: OnceFunction

  /**
   * A generator that is able to stream events as they come in.
   */
  readonly stream: StreamFunction

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

export type SubscribeListener<T> = (event: CustomEventInit<T>) => void

/**
 * The function type for the event subscription.
 */
export interface SubscribeFunction {
  <T = unknown>(
    key: string,
    event: 'refetching' | 'resolved' | 'mutating' | 'mutated' | 'forgotten' | 'hydrated',
    listener: SubscribeListener<Promise<T>>
  ): Unsubscriber
  (key: string, event: 'error' | 'aborted', listener: SubscribeListener<unknown>): Unsubscriber
  <T = unknown>(key: string, event: QueryEvent, listener: SubscribeListener<T>): Unsubscriber
}

/**
 * The emit function to manually emit events.
 */
export interface EmitFunction {
  <T = unknown>(
    key: string,
    event: 'refetching' | 'resolved' | 'mutating' | 'mutated' | 'forgotten' | 'hydrated',
    detail: Promise<T>
  ): void
  (key: string, event: 'error' | 'aborted', detail: unknown): void
  <T = unknown>(key: string, event: QueryEvent, detail: T): void
}

// TriggerFunction is used to trigger a deferred promise.
type TriggerFunction = undefined | (() => Promise<void>)

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

  function emit<T = unknown>(key: string, event: QueryEvent, detail: T) {
    events.dispatchEvent(new CustomEvent(`${event}:${key}`, { detail }))

    switch (event) {
      case 'mutated':
      case 'resolved':
      case 'hydrated':
      case 'forgotten':
        broadcast?.postMessage({ event: `${event}:${key}`, detail })
    }
  }

  /**
   * Subscribes to a given keyed event. The event handler
   * does have a payload parameter that will contain relevant
   * information depending on the event type.
   * If there's a pending resolver for that key, the `refetching`
   * event is fired immediatly.
   */

  function subscribe<T = unknown>(
    key: string,
    event: QueryEvent,
    listener: SubscribeListener<T>
  ): Unsubscriber {
    events.addEventListener(`${event}:${key}`, listener)
    const value = resolversCache.get(key)

    // For the refetching event, we want to immediatly return if there's
    // a pending resolver.
    if (event === 'refetching' && value !== undefined) {
      emit(key, event, value.item)
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

        resolver = await fn((await value?.item) as T, value?.expiresAt)
      }

      return await resolver
    }

    const result = action(resolver)

    emit(key, 'mutating', result)

    const item = await result
    const expiresAt = new Date()

    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (options?.expiration?.(item) ?? 0))

    itemsCache.set(key, { item: result, expiresAt: expiresAt })

    emit(key, 'mutated', item)

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

        emit(key, 'aborted', reason)
      }
    }
  }

  /**
   * Forgets the given keys from the items cache.
   * Does not remove any resolvers.
   * If no keys are provided the items cache is cleared.
   */
  async function forget(cacheKeys?: string | string[] | RegExp): Promise<void> {
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
        emit(key, 'forgotten', await item.item)
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
    const result = Promise.resolve(item)

    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (options?.expiration?.(item) ?? 0))

    for (const key of typeof keys === 'string' ? [keys] : keys) {
      itemsCache.set(key, { item: result, expiresAt: expiresAt })
      emit(key, 'hydrated', item)
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
  function query<T = unknown>(key: string, options?: Options<T>): Promise<T> {
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
    function refetch(key: string): Promise<T> {
      // Check if there's a pending resolver for that data.
      const pending = resolversCache.get(key)

      if (pending !== undefined) {
        return pending.item as Promise<T>
      }

      // Create the abort controller that will be
      // called when a query is aborted.
      const controller = new AbortController()

      let trigger: TriggerFunction = undefined

      // Initiate the fetching request.
      const result = new Promise<T>(function (resolve, reject) {
        trigger = async function () {
          try {
            const result = fetcher(key, { signal: controller.signal })

            // Awaits the fetching to get the result item.
            const item = await result

            const promise =
              (resolversCache.get(key)?.item as Promise<T> | undefined) ?? Promise.resolve(item)

            // Removes the resolver from the cache.
            resolversCache.delete(key)

            // Create the expiration time for the item.
            const expiresAt = new Date()
            expiresAt.setMilliseconds(expiresAt.getMilliseconds() + expiration(item))

            // Set the item to the cache.
            itemsCache.set(key, { item: promise, expiresAt })

            // Notify of the resolved item.
            emit(key, 'resolved', item)

            resolve(item)
          } catch (error) {
            // Remove the resolver.
            resolversCache.delete(key)

            // Check if the item should be removed as well.
            if (removeOnError) {
              itemsCache.delete(key)
            }

            // Notify of the error.
            emit(key, 'error', error)

            // Throw back the error.
            reject(error as Error)
          }
        }
      })

      // Adds the resolver to the cache.
      resolversCache.set(key, { item: result, controller })
      emit(key, 'refetching', result)

      trigger = trigger as TriggerFunction

      while (trigger === undefined) {
        // This ensures that the trigger
        // has been defined, as it is defined
        // inside the promise.
      }

      void trigger()

      return result
    }

    // We want to force a fresh item ignoring any current cached
    // value or its expiration time.
    if (fresh) {
      return refetch(key)
    }

    // Check if there's an item in the cache for the given key.
    const cached = itemsCache.get(key)

    if (cached === undefined) {
      // The item is not found in the items cache.
      // We need to perform a revalidation of the item.
      return refetch(key)
    }

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

      return cached.item as Promise<T>
    }

    // The item has expired but we dont allow stale
    // responses so we need to wait for the revalidation.
    if (hasExpired) {
      return refetch(key)
    }

    // The item has not yet expired, so we can return it and
    // assume it's valid since it's not yet considered stale.
    return cached.item as Promise<T>
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

  function once<T = unknown>(key: string, event: QueryEvent) {
    return new Promise<CustomEventInit<T>>(function (resolve) {
      const unsubscribe = subscribe<T>(key, event, function (event) {
        resolve(event)
        unsubscribe()
      })
    })
  }

  async function* stream<T = unknown>(key: string, event: QueryEvent) {
    for (;;) {
      yield await once<T>(key, event)
    }
  }

  return {
    query,
    emit,
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
