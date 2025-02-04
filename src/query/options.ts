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
export type TriggerFunction = undefined | (() => Promise<void>)
