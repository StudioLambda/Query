import { MutateOptions, MutationValue, Options } from 'query:index'
import { useCallback, useDebugValue, useMemo } from 'react'
import { QueryInstance, useQueryInstance } from './useQueryInstance'

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

  const { query, mutate, forget } = useQueryInstance(options)

  function refetchHandler(refetchOptions?: Options<T>) {
    return query<T>(key, {
      stale: false,
      ...options,
      ...refetchOptions,
    })
  }

  const refetch = useCallback(refetchHandler, [query, key, options])

  function mutateHandler<T = unknown>(value: MutationValue<T>, options?: MutateOptions<T>) {
    return mutate(key, value, options)
  }

  const localMutate = useCallback(mutateHandler, [mutate, key])

  function forgetHandler() {
    forget(key)
  }

  const localForget = useCallback(forgetHandler, [forget, key])

  function actionsHandler() {
    return { refetch, mutate: localMutate, forget: localForget }
  }

  return useMemo(actionsHandler, [refetch, localMutate, localForget])
}
