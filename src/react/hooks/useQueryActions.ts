import { type MutateOptions, type MutationValue, type Options } from 'query:index'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

export interface QueryActions<T = unknown> {
  readonly refetch: (refetchOptions?: Options<T>) => Promise<T>
  readonly mutate: (value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>
  readonly forget: () => Promise<void>
}

export type QueryActionsOptions<T = unknown> = Options<T> & QueryInstance

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
