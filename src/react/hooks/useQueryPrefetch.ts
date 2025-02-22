import { useDebugValue, useMemo } from 'react'
import { QueryInstance, useQueryInstance } from './useQueryInstance'
import { useStableKeys } from 'query/react:_internal'

export function useQueryPrefetch(keys: string[], options?: QueryInstance) {
  useDebugValue('useQueryPrefetch')

  const stableKeys = useStableKeys(keys)
  const { query } = useQueryInstance(options)

  void useMemo(() => stableKeys.map((key) => query(key)), [query, stableKeys])
}
