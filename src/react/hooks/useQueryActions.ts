import { type MutateOptions, type MutationValue, type Options } from 'query:index'
import { useCallback, useDebugValue, useMemo } from 'react'
import { useQueryInstance, type QueryInstance } from './useQueryInstance'

export interface QueryActions<T = unknown> {
  readonly refetch: (refetchOptions?: Options<T>) => Promise<T>
  readonly mutate: (value: MutationValue<T>, options?: MutateOptions<T>) => Promise<T>
  readonly forget: () => void
}

export type QueryActionsOptions<T = unknown> = Options<T> & QueryInstance

export function useQueryActions<T = unknown>(
  key: string,
  options?: QueryActionsOptions<T>
): QueryActions<T> {
  useDebugValue('useQueryActions')

  const {
    expiration: oExpiration,
    fetcher: oFetcher,
    stale: oStale,
    removeOnError: oRemoveOnError,
    fresh: oFresh,
  } = options ?? {}

  const { query, mutate, forget } = useQueryInstance(options)

  const refetch = useCallback(
    function (refetchOptions?: Options<T>) {
      return query<T>(key, {
        stale: oStale ?? false,
        expiration: oExpiration,
        fetcher: oFetcher,
        removeOnError: oRemoveOnError,
        fresh: oFresh,
        ...refetchOptions,
      })
    },
    [query, key, oExpiration, oFetcher, oStale, oRemoveOnError, oFresh]
  )

  const localMutate = useCallback(
    function <T = unknown>(value: MutationValue<T>, options?: MutateOptions<T>) {
      return mutate(key, value, options)
    },
    [mutate, key]
  )

  const localForget = useCallback(
    async function () {
      await forget(key)
    },
    [forget, key]
  )

  return useMemo(
    function () {
      return { refetch, mutate: localMutate, forget: localForget }
    },
    [refetch, localMutate, localForget]
  )
}
