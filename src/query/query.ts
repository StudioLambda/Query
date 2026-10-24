import {
  type Caches,
  type CacheType,
  type ItemsCacheItem,
  type ResolversCacheItem,
} from 'query:cache'
import {
  type BroadcastPayload,
  type Configuration,
  type FetcherAdditional,
  type FetcherFunction,
  type HydrateOptions,
  type MutateOptions,
  type MutationFunction,
  type MutationValue,
  type Options,
  type Query,
  type QueryEvent,
  type SubscribeListener,
  type TriggerFunction,
  type Unsubscriber,
} from 'query:options'

/**
 * Creates a default fetcher function that performs JSON requests
 * using the provided fetch implementation.
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
 * Creates an isolated query instance with cache, events, and fetch defaults.
 * Mutations commit in call order per key; independent keys do not wait for
 * one another. Committed mutations and hydration supersede older fetches
 * without changing the results returned to those fetches' callers.
 *
 * @example
 * const client = createQuery({ fetcher: async () => 'server value' })
 * const value = await client.query<string>('profile')
 * await client.mutate('profile', value.toUpperCase())
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
   * Tracks only pending mutation tails so functional mutations read the
   * previous committed value. Settled tails are removed, including failures.
   */
  const mutations = new Map<string, Promise<unknown>>()

  /**
   * Marks fetch promises invalidated by committed local writes. Weak entries
   * do not retain completed requests or accumulate per-key generations.
   */
  const supersededFetches = new WeakSet<Promise<unknown>>()

  /**
   * Prevents the current fetch from publishing over a committed local write.
   * The fetch still settles normally for callers already awaiting it.
   */
  function supersedeFetch(key: string): void {
    /** Only the resolver active at the local commit loses publication rights. */
    const pending = resolversCache.get(key)
    if (pending !== undefined) {
      supersededFetches.add(pending.item)
    }
  }

  /**
   * Retires a superseded fetch without deleting a later revalidation's
   * resolver. Returns whether its cache writes and events must be skipped.
   */
  function retireSupersededFetch(key: string, promise: Promise<unknown>): boolean {
    if (!supersededFetches.has(promise)) {
      return false
    }

    if (resolversCache.get(key)?.item === promise) {
      resolversCache.delete(key)
    }

    return true
  }

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
   * won't close automatically, therefore, the responsibility
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
   * Emits an event to all active subscribers for a given key.
   * Also broadcasts certain events (mutated, resolved, hydrated, forgotten)
   * to other browser contexts via the BroadcastChannel if configured.
   *
   * @param key - The cache key associated with the event.
   * @param event - The type of event to emit.
   * @param detail - The payload to include with the event.
   */
  function emit<T = unknown>(key: string, event: QueryEvent, detail: T) {
    events.dispatchEvent(new CustomEvent(`${event}:${key}`, { detail }))

    switch (event) {
      case 'mutated':
      case 'resolved':
      case 'hydrated':
      case 'forgotten':
        try {
          broadcast?.postMessage({ event: `${event}:${key}`, detail })
        } catch {
          // Silently ignore DataCloneError or other postMessage failures
          // (e.g. when the detail is not structurally cloneable).
        }
    }
  }

  /**
   * Subscribes to a given keyed event. The event handler
   * does have a payload parameter that will contain relevant
   * information depending on the event type.
   * If there's a pending resolver for that key, the `refetching`
   * event is fired immediately.
   */
  function subscribe<T = unknown>(
    key: string,
    event: QueryEvent,
    listener: SubscribeListener<T>
  ): Unsubscriber {
    events.addEventListener(`${event}:${key}`, listener)
    const value = resolversCache.get(key)

    // For the refetching event, we want to immediately return if there's
    // a pending resolver.
    if (event === 'refetching' && value !== undefined) {
      queueMicrotask(() => emit(key, event, value.item))
    }

    return function () {
      events.removeEventListener(`${event}:${key}`, listener)
    }
  }

  /**
   * Commits an optimistic value, serializing mutations for the same key.
   * Functional resolvers read the preceding committed value and expiration;
   * a rejected mutation leaves that value intact and does not block the queue.
   * Successful commits supersede older fetches. Values expire immediately
   * unless options.expiration supplies a lifetime in milliseconds.
   * A functional resolver must not await another mutation on its own key,
   * because that mutation is queued behind the resolver's completion.
   *
   * @example
   * const client = createQuery()
   * await client.mutate<number>('count', (previous) => (previous ?? 0) + 1)
   */
  async function mutate<T = unknown>(
    key: string,
    resolver: MutationValue<T>,
    options?: MutateOptions<T>
  ): Promise<T> {
    /**
     * The previous tail gates this mutation until its commit completes.
     * Its failure is not inherited by the next mutation.
     */
    const previous = mutations.get(key)

    /**
     * Resolves and commits one queued mutation. Resolver and expiration errors
     * propagate to its caller before any cache write or fetch invalidation.
     */
    async function action(resolver: MutationValue<T>) {
      await previous?.catch(() => {})

      if (typeof resolver === 'function') {
        /** Function values are resolvers, matching the existing mutation API. */
        const fn = resolver as MutationFunction<T>
        /** Read after the queue gate so this is the preceding committed entry. */
        const value = itemsCache.get(key)
        /** Await custom cache promises before passing their value to the resolver. */
        const item = (await value?.item) as T

        resolver = await fn(item, value?.expiresAt)
      }

      /** Resolve the value before calculating its lifetime or publishing it. */
      const item = await resolver
      /** The lifetime starts at commit, not when this mutation joined the queue. */
      const expiresAt = new Date()

      expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (options?.expiration?.(item) ?? 0))

      supersedeFetch(key)
      itemsCache.set(key, { item: result, expiresAt })
      emit(key, 'mutated', item)

      return item
    }

    /**
     * The queued result is also the promise stored by a successful commit.
     * Publishing this tail before emitting allows event handlers to enqueue.
     */
    const result = action(resolver)
    mutations.set(key, result)

    emit(key, 'mutating', result)

    try {
      return await result
    } finally {
      if (mutations.get(key) === result) {
        mutations.delete(key)
      }
    }
  }

  /**
   * Returns the current snapshot of the given key.
   * If the item is not in the items cache, it will return `undefined`.
   */
  async function snapshot<T = unknown>(key: string): Promise<T | undefined> {
    return (await itemsCache.get(key)?.item) as T
  }

  /**
   * Returns all keys currently stored in the specified cache.
   */
  function keys(type: CacheType = 'items'): readonly string[] {
    return Array.from(type === 'items' ? itemsCache.keys() : resolversCache.keys())
  }

  /**
   * Aborts the active resolvers on each key
   * by calling `.abort()` on the `AbortController`.
   * The fetcher is responsible for using the
   * `AbortSignal` to cancel the job.
   * If no keys are provided, all resolvers are aborted.
   */
  function abort(cacheKeys?: string | readonly string[], reason?: unknown): void {
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
  async function forget(cacheKeys?: string | readonly string[] | RegExp): Promise<void> {
    let itemKeys: readonly string[]

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

        // Wrap in try-catch so that rejected or pending-then-rejected
        // promises don't prevent the rest of the keys from being forgotten.
        try {
          emit(key, 'forgotten', await item.item)
        } catch {
          emit(key, 'forgotten', undefined)
        }
      }
    }
  }

  /**
   * Hydrates the given keys on the cache
   * with the given value. Hydrate should only
   * be used when you want to populate the cache.
   * Please use mutate() in most cases unless you
   * know what you are doing.
   * A hydrated value supersedes pending fetch writes and completion events.
   * Its lifetime defaults to zero milliseconds, as with mutate().
   *
   * @example
   * const client = createQuery()
   * client.hydrate('profile', { name: 'Ada' }, { expiration: () => 60000 })
   */
  function hydrate<T = unknown>(
    keys: string | readonly string[],
    item: T,
    options?: HydrateOptions<T>
  ): void {
    const expiresAt = new Date()
    const result = Promise.resolve(item)

    expiresAt.setMilliseconds(expiresAt.getMilliseconds() + (options?.expiration?.(item) ?? 0))

    for (const key of typeof keys === 'string' ? [keys] : keys) {
      supersedeFetch(key)
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
   * The returned promise contains the result item, including when a later
   * mutation or hydration supersedes that fetch's cache writes and events.
   * Superseded requests do not deduplicate subsequent revalidation requests.
   * Fetch errors reject the promise; stale background errors use events.
   *
   * @example
   * const client = createQuery({ fetcher: async () => 'profile' })
   * const profile = await client.query<string>('profile', { stale: false })
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
     * Determines if we can return a stale item.
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
    const fresh = options?.fresh ?? instanceFresh

    /**
     * Starts a revalidation or shares an existing publishable request.
     * A superseded request must not delay the next revalidation, even if its
     * fetcher ignores cancellation or remains pending indefinitely.
     */
    function refetch(key: string): Promise<T> {
      // Check if there's a pending resolver for that data.
      const pending = resolversCache.get(key)

      if (pending !== undefined && !supersededFetches.has(pending.item)) {
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
            // Awaits the fetching to get the result item.
            const item = await fetcher(key, { signal: controller.signal })

            // If the signal was aborted after the fetch resolved but
            // before we write to the cache, bail out to avoid writing
            // stale data that contradicts the abort.
            if (controller.signal.aborted) {
              reject(controller.signal.reason)
              return
            }

            if (retireSupersededFetch(key, result)) {
              resolve(item)
              return
            }

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
            if (retireSupersededFetch(key, result)) {
              reject(error)
              return
            }

            // Remove the resolver.
            resolversCache.delete(key)

            // Check if the item should be removed as well.
            if (removeOnError) {
              itemsCache.delete(key)
            }

            // Notify of the error.
            emit(key, 'error', error)

            // Throw back the error.
            reject(error)
          }
        }
      })

      // Adds the resolver to the cache.
      resolversCache.set(key, { item: result, controller })
      queueMicrotask(() => emit(key, 'refetching', result))

      // The promise executor runs synchronously,
      // so trigger is guaranteed to be defined here.
      void trigger!()

      return result
    }

    // We want to force a fresh item ignoring any current cached
    // value or its expiration time. Abort any existing in-flight
    // request so that refetch starts a genuinely new fetch instead
    // of returning the pending deduplication promise.
    if (fresh) {
      abort(key)
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
      // Refer to the error event if you need full control of errors.
      refetch(key).catch(() => {})

      return cached.item as Promise<T>
    }

    // The item has expired but we don't allow stale
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
    // Capture the current broadcast reference so that the unsubscriber
    // always targets the same channel that was subscribed to, even if
    // configure() replaces the broadcast channel later.
    const currentBroadcast = broadcast

    function onBroadcastMessage(message: MessageEvent<BroadcastPayload>) {
      events.dispatchEvent(new CustomEvent(message.data.event, { detail: message.data.detail }))
    }

    currentBroadcast?.addEventListener('message', onBroadcastMessage)

    return function () {
      currentBroadcast?.removeEventListener('message', onBroadcastMessage)
    }
  }

  /**
   * Waits for the next refetching event on one or more keys and returns
   * the resolved values. Useful for synchronizing with query updates.
   *
   * Supports a single key (returns a single value), an array of keys
   * (returns an array of values), or an object mapping property names
   * to keys (returns an object with the same shape).
   *
   * @param keys - A single key, array of keys, or object mapping names to keys.
   * @returns A promise that resolves with the fetched value(s).
   */
  async function next<T = unknown>(
    keys: string | { [K in keyof T]: string },
    signal?: AbortSignal
  ): Promise<T> {
    if (typeof keys === 'string') {
      const event = await once(keys, 'refetching', signal)
      return (await (event.detail as Promise<T>)) as T
    }

    if (Array.isArray(keys)) {
      const promises = keys.map((key) => once(key, 'refetching', signal))
      const events = await Promise.all(promises)
      const details = events.map((event) => event.detail as Promise<T>)
      return (await Promise.all(details)) as T
    }

    const objectKeys = keys as Record<string, string>
    const entries = Object.entries(objectKeys)
    const promises = entries.map(([, key]) => once(key, 'refetching', signal))
    const events = await Promise.all(promises)
    const details = await Promise.all(events.map((event) => event.detail as Promise<unknown>))
    const result = Object.fromEntries(entries.map(([name], i) => [name, details[i]]))
    return result as T
  }

  /**
   * Returns an async generator that yields resolved values as they come in
   * for the specified key(s). Allows continuous streaming of query results.
   *
   * @param keys - A single key or an object mapping property names to keys.
   * @yields The resolved value(s) each time a refetch completes.
   */
  async function* stream<T = unknown>(keys: string | { [K in keyof T]: string }) {
    const controller = new AbortController()

    try {
      for (;;) {
        yield await next<T>(keys, controller.signal)
      }
    } finally {
      controller.abort()
    }
  }

  /**
   * Returns the first occurrence of a specific event for a given key.
   * Subscribes to the event and automatically unsubscribes after receiving it.
   *
   * @param key - The cache key to listen for events on.
   * @param event - The type of event to wait for.
   * @returns A promise that resolves with the event details.
   */
  function once<T = unknown>(key: string, event: QueryEvent, signal?: AbortSignal) {
    return new Promise<CustomEventInit<T>>(function (resolve, reject) {
      const unsubscribe = subscribe<T>(key, event, function (event) {
        resolve(event)
        cleanup()
      })

      function cleanup() {
        unsubscribe()
        signal?.removeEventListener('abort', onAbort)
      }

      function onAbort() {
        cleanup()
        reject(signal!.reason)
      }

      signal?.addEventListener('abort', onAbort)

      // If the signal is already aborted, clean up immediately.
      if (signal?.aborted) {
        onAbort()
      }
    })
  }

  /**
   * Returns an async generator that yields event details each time the
   * specified event occurs for a given key. Allows iteration over a
   * continuous sequence of events.
   *
   * @param key - The cache key to listen for events on.
   * @param event - The type of event to stream.
   * @yields The event details each time the event occurs.
   */
  async function* sequence<T = unknown>(key: string, event: QueryEvent) {
    const controller = new AbortController()

    try {
      for (;;) {
        yield await once<T>(key, event, controller.signal)
      }
    } finally {
      controller.abort()
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
    sequence,
    next,
    stream,
    caches,
    events: localEvents,
    broadcast: localBroadcast,
  }
}
