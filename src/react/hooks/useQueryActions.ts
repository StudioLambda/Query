import { type MutateOptions, type MutationValue, type Options } from 'query:index'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

/**
 * The return type of the useQueryActions hook, providing methods to
 * manually control query behavior such as refetching, mutating, and
 * clearing cached data.
 *
 * @template T - The type of the cached data.
 */
export interface QueryActions<T = unknown> {
  /**
   * Triggers a fresh fetch of the data, bypassing the stale cache.
   *
   * @param refetchOptions - Optional configuration to override the default
   *                         query options for this refetch.
   * @returns A promise that resolves with the newly fetched data.
   */
  readonly refetch: (refetchOptions?: Options<T>) => Promise<T>

  /**
   * Updates the cached data with a new value or a mutation function.
   * The mutation can be synchronous or asynchronous.
   *
   * @param value - The new value or a function that receives the previous
   *                value and returns the new value.
   * @param options - Optional configuration for the mutation.
   * @returns A promise that resolves with the mutated data.
   */
  readonly mutate: (value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>

  /**
   * Removes the cached data for the key, triggering a fresh fetch on the
   * next query if clearOnForget is enabled.
   *
   * @returns A promise that resolves when the data has been forgotten.
   */
  readonly forget: () => Promise<void>
}

/**
 * Configuration options for the useQueryActions hook, combining query
 * options with an optional query instance override.
 *
 * @template T - The type of the cached data.
 */
export type QueryActionsOptions<T = unknown> = Options<T> & QueryInstance

/**
 * A React hook that provides action methods for controlling query behavior.
 * Use this hook when you need to imperatively refetch, mutate, or forget
 * cached data without subscribing to data changes.
 *
 * @template T - The type of the cached data.
 * @param key - A unique string identifier for the cached resource.
 * @param options - Optional configuration for the query actions.
 * @returns An object containing refetch, mutate, and forget functions.
 *
 * @example
 * ```tsx
 * const { refetch, mutate, forget } = useQueryActions<User>('/api/user/1')
 *
 * const handleRefresh = () => refetch()
 * const handleUpdate = (name: string) => mutate({ name })
 * const handleClear = () => forget()
 * ```
 */
export function useQueryActions<T = unknown>(
  key: string,
  options?: QueryActionsOptions<T>
): QueryActions<T> {
  const {
    expiration: oExpiration,
    fetcher: oFetcher,
    stale: oStale,
    removeOnError: oRemoveOnError,
    fresh: oFresh,
  } = options ?? {}

  const { query, mutate, forget } = useQueryInstance(options)

  function refetch(refetchOptions?: Options<T>) {
    return query<T>(key, {
      stale: oStale ?? false,
      expiration: oExpiration,
      fetcher: oFetcher,
      removeOnError: oRemoveOnError,
      fresh: oFresh,
      ...refetchOptions,
    })
  }

  function localMutate<T = unknown>(value: MutationValue<T>, options?: MutateOptions<T>) {
    return mutate(key, value, options)
  }

  async function localForget() {
    await forget(key)
  }

  return { refetch, mutate: localMutate, forget: localForget }
}
