import { type MutateOptions, type MutationValue, type Options } from 'query:index'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

/**
 * The return type of the useQueryActions hook, providing methods to
 * manually control query behavior such as refetching, mutating, and
 * clearing cached data.
 *
 * @template T - The type of the cached data.
 * @example
 * function Refresh() {
 *   const actions: QueryActions<string> = useQueryActions<string>('profile')
 *   return <button onClick={() => { void actions.refetch({ fresh: true }).catch(console.error) }}>
 *     Refresh
 *   </button>
 * }
 * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
 *   <Refresh />
 * </QueryProvider>
 */
export interface QueryActions<T = unknown> {
  /**
   * Reads using the query policy, defaulting stale to false for this action.
   * A valid cache entry is still reused unless fresh is explicitly true.
   *
   * @param refetchOptions - Optional configuration to override the default
   *                         query options for this refetch.
   * @returns The cached or fetched value; fetch failures reject the promise.
   * @example
   * function Refresh() {
   *   const { refetch } = useQueryActions<string>('profile')
   *   return <button onClick={() => { void refetch({ fresh: true }).catch(console.error) }}>
   *     Refresh
   *   </button>
   * }
   * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
   *   <Refresh />
   * </QueryProvider>
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
   * @example
   * function Rename() {
   *   const { mutate } = useQueryActions<string>('profile')
   *   return <button onClick={() => { void mutate('Grace').catch(console.error) }}>Rename</button>
   * }
   * const view = <QueryProvider query={createQuery()}><Rename /></QueryProvider>
   */
  readonly mutate: (value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>

  /**
   * Removes this key's cached result without aborting an active request.
   * Mounted data hooks with clearOnForget opt into requerying on the event;
   * any subsequent query also fetches when the entry is missing.
   *
   * @returns A promise that resolves when the data has been forgotten.
   * @example
   * function Clear() {
   *   const { forget } = useQueryActions('profile')
   *   return <button onClick={() => { void forget().catch(console.error) }}>Clear</button>
   * }
   * const view = <QueryProvider query={createQuery()}><Clear /></QueryProvider>
   */
  readonly forget: () => Promise<void>
}

/**
 * Configuration options for the useQueryActions hook, combining query
 * options with an optional query instance override.
 *
 * @template T - The type of the cached data.
 * @example
 * const options: QueryActionsOptions<string> = { query: createQuery(), fresh: true }
 * function Controls() {
 *   const actions = useQueryActions('profile', options)
 *   return <button onClick={() => { void actions.mutate('Ada').catch(console.error) }}>Set</button>
 * }
 * const view = <Controls />
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
 * function Refresh() {
 *   const { refetch } = useQueryActions<string>('profile')
 *   return <button onClick={() => { void refetch({ fresh: true }).catch(console.error) }}>
 *     Refresh
 *   </button>
 * }
 * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
 *   <Refresh />
 * </QueryProvider>
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

  /**
   * Applies captured hook policy and then the action's explicit overrides.
   * stale defaults to false, but valid entries still require fresh to bypass.
   * Fetch failures remain the caller's responsibility through the promise.
   *
   * @example
   * function Refresh() {
   *   const actions = useQueryActions<string>('profile')
   *   return <button onClick={() => { void actions.refetch({ fresh: true }).catch(console.error) }}>Refresh</button>
   * }
   * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}><Refresh /></QueryProvider>
   */
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

  /**
   * Binds the instance mutation queue to this hook's current key.
   * Mutation policy is supplied per action, not inherited from fetch options.
   *
   * @example
   * function SetName() {
   *   const actions = useQueryActions<string>('profile')
   *   return <button onClick={() => { void actions.mutate('Ada').catch(console.error) }}>Set</button>
   * }
   * const view = <QueryProvider query={createQuery()}><SetName /></QueryProvider>
   */
  function localMutate(value: MutationValue<T>, options?: MutateOptions<T>) {
    return mutate(key, value, options)
  }

  /**
   * Binds item removal to this key and preserves asynchronous event completion.
   * It does not abort the key's current fetch or erase unrelated entries.
   *
   * @example
   * function Clear() {
   *   const actions = useQueryActions('profile')
   *   return <button onClick={() => { void actions.forget().catch(console.error) }}>Clear</button>
   * }
   * const view = <QueryProvider query={createQuery()}><Clear /></QueryProvider>
   */
  async function localForget() {
    await forget(key)
  }

  return { refetch, mutate: localMutate, forget: localForget }
}
