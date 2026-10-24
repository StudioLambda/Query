import {
  type Cache,
  type Caches,
  type CacheType,
  type ItemsCacheItem,
  type ResolversCacheItem,
} from 'query:cache'

/**
 * Represents the available configuration options
 * for a query instance.
 * Supplied caches, events, and channels are retained, not cloned or closed.
 * Per-call Options can override fetch policy without replacing those stores.
 *
 * @example
 * const options: Configuration = { stale: false, expiration: () => 60000 }
 * const query = createQuery(options)
 * console.log(query.keys()) // []
 */
export interface Configuration extends Options {
  /**
   * Supplies retained result storage; defaults to a new Map per instance.
   * Sharing a cache shares entries but not the instances' event listeners.
   *
   * @example
   * const itemsCache = new Map<string, ItemsCacheItem>()
   * const query = createQuery({ itemsCache })
   * query.hydrate('count', 1)
   * console.log(itemsCache.has('count')) // true
   */
  readonly itemsCache?: Cache<ItemsCacheItem>

  /**
   * Supplies retained in-flight request storage; defaults to a new Map.
   * Shared resolver storage also shares request deduplication and ownership.
   *
   * @example
   * const resolversCache = new Map<string, ResolversCacheItem>()
   * const query = createQuery({ resolversCache })
   * console.log(query.caches().resolvers === resolversCache) // true
   */
  readonly resolversCache?: Cache<ResolversCacheItem>

  /**
   * Supplies the event target for keyed CustomEvents; defaults to a new one.
   * The instance retains this target and does not remove external listeners.
   *
   * @example
   * const events = new EventTarget()
   * const query = createQuery({ events })
   * console.log(query.events() === events) // true
   */
  readonly events?: EventTarget

  /**
   * Opts into broadcasting full query event payloads between browser
   * contexts. No channel is used by default, including in React's QueryProvider.
   * Scope the name to the account, tenant, and session whose data may be
   * shared. Channel names are routing, not an authorization boundary:
   * other code on the same origin can subscribe to the same name.
   *
   * The caller owns the channel and must close it when all users are done.
   * QueryProvider subscribes while mounted but never replaces or closes it.
   * Without a provider, call query.subscribeBroadcast() to receive events.
   *
   * @example
   * ```ts
   * const channel = new BroadcastChannel('query:tenant-a:account-42:session-7')
   * const query = createQuery({ broadcast: channel })
   * const unsubscribe = query.subscribeBroadcast()
   * query.hydrate('/user', { name: 'Alice' })
   * unsubscribe()
   * channel.close() // Only after all query users are done.
   * ```
   */
  readonly broadcast?: BroadcastChannel
}

/**
 * Additional parameters passed to the fetcher function,
 * providing an abort signal for cancellation support.
 * The fetcher owns cancellation of its underlying I/O, not the query cache.
 *
 * @example
 * const additional: FetcherAdditional = { signal: new AbortController().signal }
 * console.log(additional.signal.aborted) // false
 */
export interface FetcherAdditional {
  /**
   * Signals cancellation of this particular fetch attempt.
   * Pass it to I/O APIs; ignoring it can leave underlying work running.
   *
   * @example
   * const fetcher: FetcherFunction<string> = async (_key, { signal }) => {
   *   signal.throwIfAborted()
   *   return 'ready'
   * }
   * console.log(await fetcher('status', { signal: new AbortController().signal }))
   */
  readonly signal: AbortSignal
}

/**
 * Per-request fetching policy, falling back to instance defaults when absent.
 * Fresh bypasses cache/deduplication; stale only affects expired entries.
 *
 * @example
 * const options: Options<string> = { fetcher: async () => 'ready', stale: false }
 * console.log(await createQuery().query('status', options)) // 'ready'
 */
export interface Options<T = unknown> {
  /**
   * Determines the item deduplication interval.
   * This determines how many milliseconds an item
   * is considered valid.
   * Defaults to 2000 for fetched results. The clock starts on fetch commit;
   * this does not change hydrate/mutate's zero-millisecond defaults.
   *
   * @example
   * const query = createQuery({ expiration: () => 60000 })
   * console.log(query.keys()) // []
   */
  readonly expiration?: ExpirationOptionFunction<T>

  /**
   * Retrieves a value from the exact cache key and cancellation signal.
   * Defaults to defaultFetcher(fetch), which parses successful JSON responses.
   *
   * @example
   * const query = createQuery({ fetcher: async (key) => ({ key }) })
   * console.log(await query.query('profile')) // { key: 'profile' }
   */
  readonly fetcher?: FetcherFunction<T>

  /**
   * Determines if we can return a stale item.
   * If `true`, it will return the previous stale item
   * stored in the cache if it has expired. It will attempt
   * to revalidate it in the background. If `false`, the returned
   * promise will be the revalidation promise.
   * Defaults to true. Unexpired entries are reused even when stale is false.
   *
   * @example
   * const query = createQuery({ fetcher: async () => 1 })
   * console.log(await query.query('count', { stale: false })) // 1
   */
  readonly stale?: boolean

  /**
   * Removes the stored item if there is an error in the request.
   * By default, we don't remove the item upon failure, only the resolver
   * is removed from the cache.
   * This defaults to false and applies only to the owning fetch's failure.
   *
   * @example
   * const query = createQuery({ removeOnError: true, fetcher: async () => 1 })
   * console.log(await query.query('count')) // 1
   */
  readonly removeOnError?: boolean

  /**
   * Determines if the result should be a fresh fetched
   * instance regardless of any cached value or its expiration time.
   * Defaults to false. True also aborts the previous active request for the
   * key; that request's caller still needs to handle its own rejection.
   * Query.resource applies freshness once per shared render selection, not
   * once per retry or committed sibling read of that selection.
   *
   * @example
   * const query = createQuery({ fetcher: async () => 2 })
   * query.hydrate('count', 1, { expiration: () => 60000 })
   * console.log(await query.query('count', { fresh: true })) // 2
   */
  readonly fresh?: boolean
}

/**
 * Computes a replacement from the preceding committed value and expiration.
 * Mutations serialize per key. Missing entries supply undefined; a rejection
 * preserves the previous entry. Never await a mutation of the same key here.
 *
 * @example
 * const increment: MutationFunction<number> = (previous) => (previous ?? 0) + 1
 * console.log(await createQuery().mutate('count', increment)) // 1
 */
export type MutationFunction<T> = {
  (previous?: T, expiresAt?: Date): T | Promise<T>
}

/**
 * Direct replacement value or callback computing the next committed value.
 * Function values are always treated as mutation callbacks, not stored data.
 *
 * @example
 * const replacement: MutationValue<number> = 2
 * console.log(await createQuery().mutate('count', replacement)) // 2
 */
export type MutationValue<T> = T | MutationFunction<T>

/**
 * Wire shape used to replay a keyed event in another browser context.
 * Receiving it dispatches a local event; it does not write the local cache.
 *
 * @example
 * const payload: BroadcastPayload = { event: 'hydrated:count', detail: 1 }
 * console.log(payload.event) // 'hydrated:count'
 */
export interface BroadcastPayload {
  /**
   * Event kind and exact key separated by a colon.
   * Keys may themselves contain colons; consumers receive the full name.
   *
   * @example
   * const payload: BroadcastPayload = { event: 'hydrated:user:1', detail: 'Ada' }
   * console.log(payload.event) // 'hydrated:user:1'
   */
  readonly event: `${QueryEvent}:${string}`

  /**
   * Structured-cloneable payload delivered to remote event listeners.
   * It is unknown at this boundary; consumers must know their event schema.
   *
   * @example
   * const payload: BroadcastPayload = { event: 'hydrated:count', detail: 1 }
   * console.log(payload.detail) // 1
   */
  readonly detail: unknown
}

/**
 * Starts receiving events on the currently configured optional channel.
 * Cleanup removes that listener without closing the caller-owned channel.
 * A missing channel makes both subscription and cleanup harmless no-ops.
 *
 * @example
 * const subscribe: SubscribeBroadcastFunction = createQuery().subscribeBroadcast
 * const stop = subscribe()
 * stop()
 */
export type SubscribeBroadcastFunction = {
  (): Unsubscriber
}

/**
 * Gets a cached or fetched value according to per-call and instance policy.
 * Returned promises can reject on fetch failure or observed cancellation.
 *
 * @example
 * const read: QueryFunction = createQuery({ fetcher: async () => 1 }).query
 * try { console.log(await read<number>('count')) } catch (error) { console.error(error) }
 */
export type QueryFunction = {
  <T = unknown>(key: string, options?: Options<T>): Promise<T>
}

/**
 * A render-safe request selected by {@link Query.resource}. Fresh requests
 * are shared by key within one instance, including across Suspense retries.
 * Retain only after a consumer commits; release exactly once on cleanup.
 * Failed or abandoned uncommitted selections remain cached until forget,
 * request/cache configuration changes, or instance collection. The object
 * does not itself subscribe or notify consumers; keyed query events do that.
 *
 * @example
 * ```ts
 * const instance = createQuery({ fetcher: async () => 'hello' })
 * const request = instance.resource<string>('/hello', { fresh: true })
 * const release = request.retain()
 * try { console.log(await request.promise) } finally { release() }
 * ```
 */
export interface QueryResource<T = unknown> {
  /**
   * The selected request. Initial readers follow pending replacements;
   * retained consumers keep the last successful request until a refresh
   * succeeds. Successful mutations and hydration update it too. Initial
   * errors reject as they do for ordinary queries.
   *
   * @example
   * ```ts
   * const instance = createQuery({ fetcher: async () => 'hello' })
   * const request = instance.resource<string>('/hello')
   * try { console.log(await request.promise) } catch (error) { console.error(error) }
   * ```
   */
  readonly promise: Promise<T>

  /**
   * Marks a committed consumer as active and returns its cleanup function.
   * The last release evicts a fresh request on the next microtask, allowing
   * synchronous effect reconnection without starting another request.
   * Ordinary cached requests need no retention, so their cleanup is a no-op.
   * Release functions are not idempotent: match each retain with one release.
   * Releasing a fresh selection does not abort its transport or forget its data.
   *
   * @example
   * ```ts
   * const instance = createQuery({ fetcher: async () => 'hello' })
   * const request = instance.resource('/hello', { fresh: true })
   * const release = request.retain()
   * release() // Call once when this consumer stops using the resource.
   * ```
   */
  readonly retain: () => Unsubscriber
}

/**
 * Function type that calculates the expiration time in milliseconds
 * for a cached item based on its value.
 *
 * @template T - The type of the cached item.
 * @returns Lifetime in milliseconds, added to the commit time. A zero or
 * negative lifetime makes the entry eligible for immediate revalidation.
 * @example
 * const expiration: ExpirationOptionFunction<string> = (value) => value ? 60000 : 0
 * console.log(expiration('ready')) // 60000
 */
export type ExpirationOptionFunction<T = unknown> = {
  (item: T): number
}

/**
 * Function type for the data fetcher that retrieves data for a given key.
 * Receives an abort signal for cancellation support.
 *
 * @template T - The type of the fetched data.
 * @returns A promise for the value; rejecting it fails this fetch attempt.
 * @example
 * const fetcher: FetcherFunction<string> = async (key, { signal }) => {
 *   signal.throwIfAborted()
 *   return key.toUpperCase()
 * }
 * console.log(await createQuery({ fetcher }).query('ready')) // 'READY'
 */
export type FetcherFunction<T = unknown> = {
  (key: string, additional: FetcherAdditional): Promise<T>
}

/**
 * Lifetime policy for manually seeded data, independent of fetch defaults.
 * Without an expiration callback hydrated values expire immediately.
 *
 * @example
 * const options: HydrateOptions<number> = { expiration: () => 60000 }
 * const query = createQuery()
 * query.hydrate('count', 1, options)
 */
export interface HydrateOptions<T = unknown> {
  /**
   * Custom expiration function for the hydrated item, overriding
   * the zero-millisecond hydration default, not the instance fetch policy.
   * The callback runs before cache writes and may throw to the caller.
   *
   * @example
   * createQuery().hydrate('count', 1, { expiration: () => 60000 })
   */
  readonly expiration?: ExpirationOptionFunction<T>
}

/**
 * Lifetime policy applied when an optimistic mutation commits.
 * Without an expiration callback mutations expire immediately.
 *
 * @example
 * const options: MutateOptions<number> = { expiration: () => 60000 }
 * console.log(await createQuery().mutate('count', 1, options)) // 1
 */
export interface MutateOptions<T = unknown> {
  /**
   * Custom expiration function for the mutated item, overriding
   * the zero-millisecond mutation default, not the instance fetch policy.
   * A thrown callback rejects the mutation before changing the cache.
   *
   * @example
   * await createQuery().mutate('count', 1, { expiration: () => 60000 })
   */
  readonly expiration?: ExpirationOptionFunction<T>
}

/**
 * Queues a local replacement and resolves with its committed value.
 * Same-key calls commit in order; failures reject without blocking later
 * mutations. Commits supersede older fetch writes, not their caller results.
 *
 * @example
 * const mutate: MutateFunction = createQuery().mutate
 * try { console.log(await mutate('count', 1)) } catch (error) { console.error(error) }
 */
export type MutateFunction = {
  <T = unknown>(key: string, item: MutationValue<T>, options?: MutateOptions<T>): Promise<T>
}

/**
 * Synchronously seeds one or more keys with the same retained value/promise.
 * Supersedes older fetch writes; custom expiration errors throw before writes.
 *
 * @example
 * const hydrate: HydrateFunction = createQuery().hydrate
 * hydrate(['primary', 'alias'], { name: 'Ada' }, { expiration: () => 60000 })
 */
export type HydrateFunction = {
  <T = unknown>(keys: string | readonly string[], item: T, options?: HydrateOptions<T>): void
}

/**
 * Releases an acquired event subscription without closing shared resources.
 * Call it when the subscriber stops using a query to avoid retained listeners.
 *
 * @example
 * const stop: Unsubscriber = createQuery().subscribe('count', 'hydrated', () => {})
 * stop()
 */
export type Unsubscriber = () => void

/**
 * Function type that returns the first event that occurs for a given key.
 * Subscribes to the event and automatically unsubscribes after receiving it.
 * An optional signal cancels only the wait, rejecting with its abort reason.
 *
 * @example
 * const query = createQuery()
 * const once: OnceFunction = query.once
 * const pending = once<number>('count', 'hydrated')
 * query.hydrate('count', 1)
 * console.log((await pending).detail) // 1
 */
export type OnceFunction = {
  <T = unknown>(key: string, event: QueryEvent, signal?: AbortSignal): Promise<CustomEventInit<T>>
}

/**
 * Function type that returns an async generator yielding events as they
 * occur for a given key, allowing iteration over a sequence of events.
 * Listens only during each pending next(); it does not buffer intervening
 * events. Calling return() cannot interrupt an already pending event wait.
 *
 * @example
 * const query = createQuery()
 * const sequence: SequenceFunction = query.sequence
 * const events = sequence<number>('count', 'hydrated')
 * const pending = events.next()
 * query.hydrate('count', 1)
 * console.log((await pending).value?.detail) // 1
 * await events.return(undefined)
 */
export type SequenceFunction = {
  <T = unknown>(key: string, event: QueryEvent): AsyncGenerator<CustomEventInit<T>>
}

/**
 * Function type that waits for and returns the next resolved value(s)
 * for one or more keys after a refetching event occurs.
 * Object/array inputs preserve their shape. It does not initiate fetching;
 * an optional signal cancels event waits, not already received fetch promises.
 *
 * @example
 * const query = createQuery({ fetcher: async () => 1 })
 * const next: NextFunction = query.next
 * const pending = next<number>('count')
 * await query.query('count')
 * console.log(await pending) // 1
 */
export type NextFunction = {
  <T = unknown>(keys: string | { [K in keyof T]: string }, signal?: AbortSignal): Promise<T>
}

/**
 * Function type that returns an async generator yielding resolved values
 * as they come in, allowing continuous streaming of query results.
 * It waits for refetching events without initiating queries or buffering
 * between iterations. return() cannot interrupt an already pending wait.
 *
 * @example
 * const query = createQuery({ fetcher: async () => 1 })
 * const stream: StreamFunction = query.stream
 * const values = stream<number>('count')
 * const pending = values.next()
 * await query.query('count')
 * console.log((await pending).value) // 1
 * await values.return(undefined)
 */
export type StreamFunction = {
  <T = unknown>(keys: string | { [K in keyof T]: string }): AsyncGenerator<T>
}

/**
 * Function type for updating the query instance configuration at runtime.
 * Allows partial updates to the configuration options.
 * Undefined retains existing values, including channels; explicit false
 * updates boolean options. Replacing stores does not migrate old entries.
 * Supplying any request/cache property invalidates render selections, even
 * if its value is undefined; events/broadcast-only updates preserve them.
 *
 * @example
 * const configure: ConfigureFunction = createQuery({ fresh: true }).configure
 * configure({ fresh: false, stale: false })
 */
export type ConfigureFunction = {
  (options?: Configuration): void
}

/**
 * Function type for aborting pending query resolvers. Can abort all
 * resolvers, specific keys, or provide a custom abort reason.
 * Removes selected resolvers and emits aborted; fetchers must honor their
 * signals for prompt I/O cancellation. Existing callers still settle later.
 *
 * @example
 * const abort: AbortFunction = createQuery().abort
 * abort(['profile', 'settings'], 'navigation')
 */
export type AbortFunction = {
  (key?: string | readonly string[], reason?: unknown): void
}

/**
 * Function type that returns the current cached value for a key without
 * triggering a fetch. Returns undefined if the key is not in the cache.
 * Expiration is ignored. A custom stored rejected promise rejects this read.
 *
 * @example
 * const query = createQuery()
 * query.hydrate('count', 1)
 * const snapshot: SnapshotFunction = query.snapshot
 * console.log(await snapshot<number>('count')) // 1
 */
export type SnapshotFunction = {
  <T = unknown>(key: string): Promise<T | undefined>
}

/**
 * Function type that returns all keys currently stored in the specified
 * cache (items or resolvers).
 * Defaults to items, includes expired entries, and preserves store order.
 *
 * @example
 * const keys: KeysFunction = createQuery().keys
 * console.log(keys('resolvers')) // []
 */
export type KeysFunction = {
  (cache?: CacheType): readonly string[]
}

/**
 * Function type that returns the expiration date of a cached item.
 * Returns undefined if the key is not in the cache.
 * Returns the retained Date, not a clone; callers must not mutate it.
 *
 * @example
 * const expiration: ExpirationFunction = createQuery().expiration
 * console.log(expiration('missing')) // undefined
 */
export type ExpirationFunction = {
  (key: string): Date | undefined
}

/**
 * Function type for removing cached data. Can forget specific keys,
 * multiple keys, or keys matching a regular expression pattern.
 * Omitted keys select all items. It does not abort requests, which may
 * repopulate the cache. Events follow awaiting each removed result promise.
 * Also drops matching fresh render selections, including failed/abandoned
 * reads with no item entry. Patterns and omitted keys cover both stores.
 *
 * @example
 * const query = createQuery()
 * query.hydrate('count', 1)
 * const forget: ForgetFunction = query.forget
 * await forget(/^count$/)
 * console.log(query.keys()) // []
 */
export type ForgetFunction = {
  (keys?: string | readonly string[] | RegExp): Promise<void>
}

/**
 * An isolated async-data instance. Imperative queries use cache policy on
 * every call; render resources can share a fresh request across retries and
 * committed sibling consumers. Obtain an implementation from createQuery().
 *
 * @example
 * ```ts
 * const instance: Query = createQuery({ fetcher: async () => 'hello' })
 * try { console.log(await instance.query<string>('/hello')) }
 * catch (error) { console.error(error) }
 * ```
 */
export interface Query {
  /**
   * Updates supplied defaults. Request/cache options invalidate fresh
   * selections; changing only events/broadcast preserves them. Existing
   * promises/transports remain active; ordinary cached items remain.
   * Undefined keeps the prior setting; false and expiration callbacks returning
   * zero are valid. Nullish values cannot remove a configured channel.
   *
   * @example
   * ```ts
   * const instance = createQuery({ fetcher: async () => 'hello' })
   * instance.configure({ fresh: true })
   * instance.configure({ fresh: false, expiration: () => 0 })
   * ```
   */
  readonly configure: ConfigureFunction

  /**
   * Fetches the key information using a fetcher.
   * The returned promise contains the result item.
   * Valid cached promises are reused unless fresh is true. See QueryFunction.
   *
   * @example
   * const query = createQuery({ fetcher: async () => 1 })
   * try { console.log(await query.query<number>('count')) } catch (error) { console.error(error) }
   */
  readonly query: QueryFunction

  /**
   * Selects a request for a render consumer. Ordinary requests keep query's
   * cache/expiration behavior. With effective fresh: true, the first read
   * bypasses the cache; retries and same-key fresh consumers share that
   * request until the last retained consumer releases it. Uncommitted reads
   * remain available until forget, request/cache reconfiguration or disposal.
   * Query options are selected by the first fresh read, not by each sibling.
   * Explicit query calls remain independent and can force a new request.
   * Rejected selections are retained too: forget the key or explicitly
   * refresh it before retrying an error boundary. Cache events remain the
   * notification mechanism; the resource itself does not subscribe consumers.
   *
   * @example
   * ```ts
   * const instance = createQuery({ fetcher: async () => 'hello' })
   * const request = instance.resource<string>('/hello', { fresh: true })
   * const release = request.retain()
   * try { console.log(await request.promise) } finally { release() }
   * ```
   */
  readonly resource: <T = unknown>(key: string, options?: Options<T>) => QueryResource<T>

  /**
   * Emit is able to send events to active subscribers
   * with the given payload. It is a low level API
   * and should be used with care.
   * It dispatches events, not cache writes. Runtime success completion
   * payloads are values; refetching and mutating payloads are promises.
   *
   * @example
   * const query = createQuery()
   * const stop = query.subscribe('count', 'hydrated', (event) => console.log(event.detail))
   * query.emit('count', 'hydrated', 1)
   * stop()
   */
  readonly emit: EmitFunction

  /**
   * Subscribes to a given event & key. The event handler
   * does have a payload parameter that will contain relevant
   * information depending on the event type.
   * Runtime refetching/mutating detail is a promise; resolved, mutated,
   * hydrated, and forgotten detail is the value, despite legacy overloads.
   * Errors/aborts carry their reason. Cleanup removes the keyed listener.
   *
   * @example
   * const query = createQuery()
   * const stop = query.subscribe('count', 'hydrated', (event) => console.log(event.detail))
   * query.hydrate('count', 1)
   * stop()
   */
  readonly subscribe: SubscribeFunction

  /**
   * Subscribes to the broadcast channel
   * to listen for other browser context
   * events and reproduce them in the current
   * context.
   * No channel is created by default. Remote events do not update caches;
   * cleanup removes the listener without closing the captured channel.
   *
   * @example
   * const query = createQuery()
   * const stop = query.subscribeBroadcast() // No configured channel: no-op.
   * stop()
   */
  readonly subscribeBroadcast: SubscribeBroadcastFunction

  /**
   * Mutates the key with a given optimistic value, defaulting to immediate
   * expiration unless an explicit mutation lifetime is set.
   * Same-key mutations serialize; failed callbacks preserve the old entry.
   *
   * @example
   * const query = createQuery()
   * try { await query.mutate<number>('count', (value) => (value ?? 0) + 1) }
   * catch (error) { console.error(error) }
   */
  readonly mutate: MutateFunction

  /**
   * Aborts the active resolvers on each key
   * by calling `.abort()` on the `AbortController`.
   * The fetcher is responsible for using the
   * `AbortSignal` to cancel the job.
   * Omitted keys select every resolver. Aborting does not erase cached data.
   *
   * @example
   * createQuery().abort(['profile', 'settings'], 'navigation')
   */
  readonly abort: AbortFunction

  /**
   * Forgets items and fresh render selections for matching keys, including
   * selections from abandoned pending renders. Does not abort transports.
   * Omit keys to forget all, or pass a string, list or regular expression.
   *
   * @example
   * ```ts
   * const instance = createQuery({ fetcher: async () => 'hello' })
   * await instance.forget('/hello')
   * ```
   */
  readonly forget: ForgetFunction

  /**
   * Hydrates the given keys on the cache
   * with the given value and expiration time.
   * Defaults to immediate expiration and supersedes older fetch publication.
   * The supplied object is shared across the selected keys, not cloned.
   *
   * @example
   * createQuery().hydrate(['profile', 'alias'], { name: 'Ada' }, { expiration: () => 60000 })
   */
  readonly hydrate: HydrateFunction

  /**
   * Copies keys from items (the default) or resolvers in store iteration order.
   * Expired stored entries are included; the returned array is independent.
   *
   * @example
   * const query = createQuery()
   * query.hydrate('count', 1)
   * console.log(query.keys()) // ['count']
   */
  readonly keys: KeysFunction

  /**
   * Returns the expiration date of a given key item.
   * If the item is not in the cache, it will return `undefined`.
   * The returned Date is retained by the cache and must not be mutated.
   *
   * @example
   * const query = createQuery()
   * console.log(query.expiration('missing')) // undefined
   */
  readonly expiration: ExpirationFunction

  /**
   * Returns the current snapshot of the given key.
   * If the item is not in the items cache, it will return `undefined`.
   * Reads expired entries too, without fetching or changing their lifetime.
   *
   * @example
   * const query = createQuery()
   * query.hydrate('count', 1)
   * console.log(await query.snapshot<number>('count')) // 1
   */
  readonly snapshot: SnapshotFunction

  /**
   * Returns the first event on the given key that happens.
   *
   * It does so by subscribing and unsubscribing after event has
   * been emitted.
   * The optional signal rejects the wait with its reason and cleans up.
   *
   * @example
   * const query = createQuery()
   * const pending = query.once<number>('count', 'hydrated')
   * query.hydrate('count', 1)
   * console.log((await pending).detail) // 1
   */
  readonly once: OnceFunction

  /**
   * Yields one event per iteration without buffering between iterations.
   * Cleanup runs on generator exit; return() does not interrupt a pending wait.
   *
   * @example
   * const query = createQuery()
   * const events = query.sequence<number>('count', 'hydrated')
   * const pending = events.next()
   * query.hydrate('count', 1)
   * console.log((await pending).value?.detail) // 1
   * await events.return(undefined)
   */
  readonly sequence: SequenceFunction

  /**
   * Awaits refetching events and their result promises, preserving key shape.
   * Does not initiate a fetch or wait on cached reads that emit no such event.
   *
   * @example
   * const query = createQuery({ fetcher: async () => 1 })
   * const pending = query.next<number>('count')
   * await query.query('count')
   * console.log(await pending) // 1
   */
  readonly next: NextFunction

  /**
   * Returns an async generator that returns the next queries
   * as they come in.
   * Iterations wait for new refetching events; intervening events are not
   * buffered. return() cannot interrupt an already pending next() wait.
   *
   * @example
   * const query = createQuery({ fetcher: async () => 1 })
   * const values = query.stream<number>('count')
   * const pending = values.next()
   * await query.query('count')
   * console.log((await pending).value) // 1
   * await values.return(undefined)
   */
  readonly stream: StreamFunction

  /**
   * Returns live references to both current stores, not copies of their data.
   * Direct writes bypass query event delivery and ownership protection.
   *
   * @example
   * const query = createQuery()
   * console.log(Array.from(query.caches().items.keys())) // []
   */
  readonly caches: () => Caches

  /**
   * Returns the current retained EventTarget for low-level integration.
   * Prefer subscribe() for typed keyed listeners and explicit cleanup.
   *
   * @example
   * const query = createQuery()
   * console.log(query.events() instanceof EventTarget) // true
   */
  readonly events: () => EventTarget

  /**
   * Returns the caller-owned channel, or undefined when broadcasting is off.
   * Query never closes this channel; scope names are not authorization.
   *
   * @example
   * console.log(createQuery().broadcast()) // undefined
   */
  readonly broadcast: () => BroadcastChannel | undefined
}

/**
 * Lifecycle event names scoped to an exact cache key by subscribe()/emit().
 * Refetching/mutating carry promises; completion events carry runtime values;
 * error/aborted carry reasons. Broadcasting only forwards completion events.
 *
 * @example
 * const event: QueryEvent = 'hydrated'
 * const query = createQuery()
 * const stop = query.subscribe('count', event, (value) => console.log(value.detail))
 * query.hydrate('count', 1)
 * stop()
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
 * Callback function type for event subscriptions. Receives the event
 * with its detail payload when the subscribed event occurs.
 *
 * @template T - The type of the event detail payload.
 * @example
 * const listener: SubscribeListener<number> = (event) => console.log(event.detail)
 * const query = createQuery()
 * const stop = query.subscribe<number>('count', 'hydrated', listener)
 * query.hydrate('count', 1)
 * stop()
 */
export type SubscribeListener<T> = (event: CustomEventInit<T>) => void

/**
 * Registers a keyed listener and returns its cleanup function.
 * Pending refetching is replayed in a microtask to new subscribers. Runtime
 * completion details are T, not Promise<T>; legacy success-event overloads
 * also describe completion events as promises. Use an explicit listener
 * type or the generic QueryEvent overload when consuming those values.
 *
 * @example
 * const query = createQuery()
 * const subscribe: SubscribeFunction = query.subscribe
 * const listener: SubscribeListener<number> = (event) => console.log(event.detail)
 * const stop = subscribe<number>('count', 'hydrated', listener)
 * query.hydrate('count', 1)
 * stop()
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
 * Dispatches keyed events without altering cache contents.
 * Completion events use runtime values, although legacy overloads also
 * accept promises. Configured broadcasts forward cloneable completion
 * payloads; postMessage failures are intentionally ignored.
 *
 * @example
 * const query = createQuery()
 * const emit: EmitFunction = query.emit
 * const stop = query.subscribe('count', 'hydrated', (event) => console.log(event.detail))
 * emit('count', 'hydrated', 1)
 * stop()
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

/**
 * Function type used internally to trigger a deferred promise resolution.
 * Undefined when no trigger is pending.
 * This is an implementation-support type, not a query scheduling API.
 *
 * @example
 * const trigger: TriggerFunction = async () => {}
 * await trigger?.()
 */
export type TriggerFunction = undefined | (() => Promise<void>)
