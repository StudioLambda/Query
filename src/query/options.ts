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

/**
 * Additional parameters passed to the fetcher function,
 * providing an abort signal for cancellation support.
 */
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
  readonly expiration?: ExpirationOptionFunction<T>

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

/**
 * Function type that calculates the expiration time in milliseconds
 * for a cached item based on its value.
 *
 * @template T - The type of the cached item.
 */
export type ExpirationOptionFunction<T = unknown> = {
  (item: T): number
}

/**
 * Function type for the data fetcher that retrieves data for a given key.
 * Receives an abort signal for cancellation support.
 *
 * @template T - The type of the fetched data.
 */
export type FetcherFunction<T = unknown> = {
  (key: string, additional: FetcherAdditional): Promise<T>
}

/**
 * The mutate function options.
 */
export interface HydrateOptions<T = unknown> {
  /**
   * Custom expiration function for the hydrated item, overriding
   * the default expiration configuration.
   */
  expiration?: ExpirationOptionFunction<T>
}

/**
 * The mutate function options.
 */
export interface MutateOptions<T = unknown> {
  /**
   * Custom expiration function for the mutated item, overriding
   * the default expiration configuration.
   */
  expiration?: ExpirationOptionFunction<T>
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
 * Function type that returns the first event that occurs for a given key.
 * Subscribes to the event and automatically unsubscribes after receiving it.
 */
export type OnceFunction = {
  <T = unknown>(key: string, event: QueryEvent): Promise<CustomEventInit<T>>
}

/**
 * Function type that returns an async generator yielding events as they
 * occur for a given key, allowing iteration over a sequence of events.
 */
export type SequenceFunction = {
  <T = unknown>(key: string, event: QueryEvent): AsyncGenerator<CustomEventInit<T>>
}

/**
 * Function type that waits for and returns the next resolved value(s)
 * for one or more keys after a refetching event occurs.
 */
export type NextFunction = {
  <T = unknown>(keys: string | { [K in keyof T]: string }): Promise<T>
}

/**
 * Function type that returns an async generator yielding resolved values
 * as they come in, allowing continuous streaming of query results.
 */
export type StreamFunction = {
  <T = unknown>(keys: string | { [K in keyof T]: string }): AsyncGenerator<T>
}

/**
 * Function type for updating the query instance configuration at runtime.
 * Allows partial updates to the configuration options.
 */
export type ConfigureFunction = {
  (options?: Partial<Configuration>): void
}

/**
 * Function type for aborting pending query resolvers. Can abort all
 * resolvers, specific keys, or provide a custom abort reason.
 */
export type AbortFunction = {
  (key?: string | string[], reason?: unknown): void
}

/**
 * Function type that returns the current cached value for a key without
 * triggering a fetch. Returns undefined if the key is not in the cache.
 */
export type SnapshotFunction = {
  <T = unknown>(key: string): Promise<T | undefined>
}

/**
 * Function type that returns all keys currently stored in the specified
 * cache (items or resolvers).
 */
export type KeysFunction = {
  (cache?: CacheType): string[]
}

/**
 * Function type that returns the expiration date of a cached item.
 * Returns undefined if the key is not in the cache.
 */
export type ExpirationFunction = {
  (key: string): Date | undefined
}

/**
 * Function type for removing cached data. Can forget specific keys,
 * multiple keys, or keys matching a regular expression pattern.
 */
export type ForgetFunction = {
  (keys?: string | string[] | RegExp): Promise<void>
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
  readonly abort: AbortFunction

  /**
   * Forgets the given keys from the cache.
   * Removes items from both, the cache and resolvers.
   */
  readonly forget: ForgetFunction

  /**
   * Hydrates the given keys on the cache
   * with the given value and expiration time.
   */
  readonly hydrate: HydrateFunction

  /**
   * Returns the given keys for the given cache.
   */
  readonly keys: KeysFunction

  /**
   * Returns the expiration date of a given key item.
   * If the item is not in the cache, it will return `undefined`.
   */
  readonly expiration: ExpirationFunction

  /**
   * Returns the current snapshot of the given key.
   * If the item is not in the items cache, it will return `undefined`.
   */
  readonly snapshot: SnapshotFunction

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
  readonly sequence: SequenceFunction

  /**
   * Returns the next queries performed by lambda query.
   */
  readonly next: NextFunction

  /**
   * Returns an async generator that returns the next queries
   * as they come in.
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

/**
 * Callback function type for event subscriptions. Receives the event
 * with its detail payload when the subscribed event occurs.
 *
 * @template T - The type of the event detail payload.
 */
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

/**
 * Function type used internally to trigger a deferred promise resolution.
 * Undefined when no trigger is pending.
 */
export type TriggerFunction = undefined | (() => Promise<void>)
