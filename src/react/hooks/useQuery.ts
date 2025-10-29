import { type ContextValue } from 'query/react:context'
import { type Options } from 'query:index'
import { type QueryInstance } from './useQueryInstance'
import { useQueryActions, type QueryActions } from './useQueryActions'
import { useQueryStatus, type Status } from './useQueryStatus'
import { useQueryBasic, type BasicResource } from './useQueryBasic'

type AdditionalHooks<T> = QueryActions<T> & BasicResource<T> & Status

export interface Resource<T = unknown> extends AdditionalHooks<T> {
  data: T
  isPending: boolean
}

export type ResourceOptions<T = unknown> = ContextValue & Options<T> & QueryInstance

export function useQuery<T = unknown>(key: string, options?: ResourceOptions<T>): Resource<T> {
  const basic = useQueryBasic<T>(key, options)
  const actions = useQueryActions<T>(key, options)
  const status = useQueryStatus(key, options)

  return { ...basic, ...actions, ...status }
}
