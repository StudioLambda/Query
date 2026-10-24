/**
 * Minimal synchronous storage contract used by the query caches.
 * Values are retained, not cloned; Map implements this contract. Custom
 * stores must expose current keys and return undefined for missing entries.
 *
 * @example
 * const cache: Cache<number> = new Map()
 * cache.set('count', 1)
 * console.log(cache.get('count')) // 1
 */
export interface Cache<T = unknown> {
  /**
   * Reads the retained entry without fetching or checking expiration.
   * Missing keys return undefined; the stored object is not copied.
   *
   * @example
   * const cache: Cache<number> = new Map([['count', 1]])
   * console.log(cache.get('count')) // 1
   */
  readonly get: (key: string) => T | undefined

  /**
   * Retains a value under its exact key, replacing any existing entry.
   * Query instances rely on this write being visible synchronously.
   *
   * @example
   * const cache: Cache<number> = new Map()
   * cache.set('count', 2)
   * console.log(cache.get('count')) // 2
   */
  readonly set: (key: string, value: T) => void

  /**
   * Removes the entry synchronously; deleting a missing key is harmless.
   * Direct deletion does not emit query events or cancel a request.
   *
   * @example
   * const cache: Cache<number> = new Map([['count', 1]])
   * cache.delete('count')
   * console.log(cache.get('count')) // undefined
   */
  readonly delete: (key: string) => void

  /**
   * Iterates the stored keys in the underlying store's iteration order.
   * No expiration filtering is performed by this storage interface.
   *
   * @example
   * const cache: Cache<number> = new Map([['count', 1]])
   * console.log(Array.from(cache.keys())) // ['count']
   */
  readonly keys: () => IterableIterator<string>
}

/**
 * Retained result promise and its expiration date in the items cache.
 * Expired entries remain readable until overwritten or explicitly forgotten.
 *
 * @example
 * const entry: ItemsCacheItem<number> = {
 *   item: Promise.resolve(1), expiresAt: new Date(0),
 * }
 * console.log(await entry.item) // 1
 */
export interface ItemsCacheItem<T = unknown> {
  /**
   * Keeps the result promise so valid cache reads preserve promise identity.
   * Awaiting a custom cache's rejected promise can reject a snapshot read.
   *
   * @example
   * const entry: ItemsCacheItem<number> = { item: Promise.resolve(1), expiresAt: new Date(0) }
   * console.log(await entry.item) // 1
   */
  readonly item: Promise<T>

  /**
   * Absolute time after which a query may revalidate this entry.
   * The Date is retained, not cloned; do not mutate it after insertion.
   *
   * @example
   * const entry: ItemsCacheItem<number> = { item: Promise.resolve(1), expiresAt: new Date(0) }
   * console.log(entry.expiresAt.getTime()) // 0
   */
  readonly expiresAt: Date
}

/**
 * Active fetch promise and its cancellation/ownership controller.
 * Query instances remove the entry when its owning request settles.
 *
 * @example
 * const entry: ResolversCacheItem<number> = {
 *   item: Promise.resolve(1), controller: new AbortController(),
 * }
 * console.log(await entry.item) // 1
 */
export interface ResolversCacheItem<T = unknown> {
  /**
   * Pending request promise shared by deduplicated callers of this key.
   * It can reject when fetching fails or cancellation is observed.
   *
   * @example
   * const entry: ResolversCacheItem<number> = {
   *   item: Promise.resolve(1), controller: new AbortController(),
   * }
   * console.log(await entry.item) // 1
   */
  readonly item: Promise<T>

  /**
   * Signals cancellation and identifies which request owns the resolver.
   * A fetcher must observe its signal to cancel underlying work promptly.
   *
   * @example
   * const entry: ResolversCacheItem<number> = {
   *   item: Promise.resolve(1), controller: new AbortController(),
   * }
   * entry.controller.abort('navigation')
   */
  readonly controller: AbortController
}

/**
 * Selects stored results or active requests for key enumeration.
 * The default for query.keys() is the items cache.
 *
 * @example
 * const cache: CacheType = 'resolvers'
 * console.log(createQuery().keys(cache)) // []
 */
export type CacheType = 'resolvers' | 'items'

/**
 * Live storage references returned by query.caches(), not a snapshot copy.
 * Prefer query methods for writes so ownership and events stay consistent.
 *
 * @example
 * const caches: Caches = createQuery().caches()
 * console.log(Array.from(caches.items.keys())) // []
 */
export interface Caches {
  /**
   * A cache that contains the resolved items alongside
   * their expiration time.
   * Direct access bypasses event delivery and request ownership rules.
   *
   * @example
   * const query = createQuery()
   * query.hydrate('count', 1)
   * console.log(await query.caches().items.get('count')?.item) // 1
   */
  readonly items: Cache<ItemsCacheItem>

  /**
   * A cache that contains the resolvers alongside
   * their abort controllers.
   * Inspect it for diagnostics; use query.abort() to cancel with events.
   *
   * @example
   * const query = createQuery()
   * console.log(Array.from(query.caches().resolvers.keys())) // []
   */
  readonly resolvers: Cache<ResolversCacheItem>
}
