import { type ContextValue } from 'query/react:context'
import { type Options } from 'query:index'
import { type QueryInstance } from './useQueryInstance'
import { useQueryActions, type QueryActions } from './useQueryActions'
import { useQueryStatus, type Status } from './useQueryStatus'
import { useQueryBasic, type BasicResource } from './useQueryBasic'

/**
 * Combined type that merges query actions, basic resource data,
 * and status information into a single interface.
 */
type AdditionalHooks<T> = QueryActions<T> & BasicResource<T> & Status

/**
 * The return type of the useQuery hook, providing access to fetched data,
 * pending state, query actions (refetch, mutate, forget), and cache status.
 *
 * @template T - The type of the fetched data.
 */
export interface Resource<T = unknown> extends AdditionalHooks<T> {
  /**
   * The fetched data for the given key.
   */
  readonly data: T

  /**
   * Indicates whether a transition is currently pending.
   */
  readonly isPending: boolean
}

/**
 * Configuration options for the useQuery hook, combining context values,
 * query options, and an optional query instance override.
 *
 * @template T - The type of the fetched data.
 */
export type ResourceOptions<T = unknown> = ContextValue & Options<T> & QueryInstance

/**
 * A comprehensive React hook for managing async data fetching with
 * automatic caching, deduplication, and stale-while-revalidate behavior.
 * Combines the functionality of useQueryBasic, useQueryActions, and
 * useQueryStatus into a single convenient hook.
 *
 * @template T - The type of the fetched data.
 * @param key - A unique string identifier for the cached resource.
 * @param options - Optional configuration for the query behavior.
 * @returns A resource object containing the data, pending state, actions,
 *          and cache status.
 *
 * @example
 * ```tsx
 * const { data, isPending, refetch } = useQuery<User>('/api/user/1')
 *
 * if (isPending) return <Loading />
 * return <UserProfile user={data} onRefresh={refetch} />
 * ```
 */
export function useQuery<T = unknown>(key: string, options?: ResourceOptions<T>): Resource<T> {
  const basic = useQueryBasic<T>(key, options)
  const actions = useQueryActions<T>(key, options)
  const status = useQueryStatus(key, options)

  return { ...basic, ...actions, ...status }
}
