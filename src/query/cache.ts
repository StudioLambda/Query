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
export interface ItemsCacheItem<T = unknown> {
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
export interface ResolversCacheItem<T = unknown> {
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
 * Determines the cache type.
 */
export type CacheType = 'resolvers' | 'items'

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
