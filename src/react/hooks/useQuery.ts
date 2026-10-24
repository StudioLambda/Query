import { type ContextValue } from 'query/react:context'
import { type Options } from 'query:index'
import { type QueryInstance } from './useQueryInstance'
import { useQueryActions, type QueryActions } from './useQueryActions'
import { useQueryStatus, type Status } from './useQueryStatus'
import { useQueryBasic, type BasicResource } from './useQueryBasic'

/**
 * Combined type that merges query actions, basic resource data,
 * and status information into a single interface.
 * This local composition keeps Resource aligned with the three hooks it uses.
 *
 * @example
 * function Profile() {
 *   const resource = useQuery<string>('profile')
 *   return <span>{resource.data}</span>
 * }
 * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
 *   <Suspense fallback="Loading"><Profile /></Suspense>
 * </QueryProvider>
 */
type AdditionalHooks<T> = QueryActions<T> & BasicResource<T> & Status

/**
 * The return type of the useQuery hook, providing access to fetched data,
 * pending state, query actions (refetch, mutate, forget), and cache status.
 *
 * @template T - The type of the fetched data.
 * @example
 * function Profile() {
 *   const resource: Resource<string> = useQuery<string>('profile')
 *   return <span>{resource.data}</span>
 * }
 * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
 *   <Suspense fallback="Loading"><Profile /></Suspense>
 * </QueryProvider>
 */
export interface Resource<T = unknown> extends AdditionalHooks<T> {
  /**
   * Current resolved value, retained rather than cloned from the cache.
   * Treat it as immutable; blocking initial reads suspend instead of
   * returning undefined as a loading sentinel.
   *
   * @example
   * function Profile() {
   *   const resource = useQuery<string>('profile')
   *   return <span>{resource.data}</span>
   * }
   * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
   *   <Suspense fallback="Loading"><Profile /></Suspense>
   * </QueryProvider>
   */
  readonly data: T

  /**
   * Reports the selected local or shared React transition's pending state.
   * It is not an initial-loading flag; initial blocking reads use Suspense.
   *
   * @example
   * function Profile() {
   *   const resource = useQuery<string>('profile')
   *   return <span aria-busy={resource.isPending}>{resource.data}</span>
   * }
   * const view = <QueryProvider query={createQuery({ fetcher: async () => 'Ada' })}>
   *   <Suspense fallback="Loading"><Profile /></Suspense>
   * </QueryProvider>
   */
  readonly isPending: boolean
}

/**
 * Configuration options for the useQuery hook, combining context values,
 * query options, and an optional query instance override.
 *
 * @template T - The type of the fetched data.
 * @example
 * const options: ResourceOptions<string> = {
 *   query: createQuery({ fetcher: async () => 'Ada' }), stale: false,
 * }
 * function Profile() { return <span>{useQuery('profile', options).data}</span> }
 * const view = <Suspense fallback="Loading"><Profile /></Suspense>
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
 * import { Suspense } from 'react'
 * import { createRoot } from 'react-dom/client'
 * import { ErrorBoundary } from 'react-error-boundary'
 * import { createQuery } from '@studiolambda/query'
 * import { QueryProvider, useQuery } from '@studiolambda/query/react'
 *
 * const query = createQuery({ fetcher: async () => 'Ada' })
 * function Profile() {
 *   const { data, isPending } = useQuery<string>('profile')
 *   return <span aria-busy={isPending}>{data}</span>
 * }
 * createRoot(document.createElement('div')).render(
 *   <QueryProvider query={query}>
 *     <ErrorBoundary fallback={<span>Unavailable</span>}>
 *       <Suspense fallback="Loading"><Profile /></Suspense>
 *     </ErrorBoundary>
 *   </QueryProvider>
 * )
 * ```
 */
export function useQuery<T = unknown>(key: string, options?: ResourceOptions<T>): Resource<T> {
  const basic = useQueryBasic<T>(key, options)
  const actions = useQueryActions<T>(key, options)
  const status = useQueryStatus(key, options)

  return { ...basic, ...actions, ...status }
}
