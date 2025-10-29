import { useEffect } from 'react'
import { QueryInstance, useQueryInstance } from './useQueryInstance'

export function useQueryPrefetch(keys: string[], options?: QueryInstance) {
  const { query } = useQueryInstance(options)

  useEffect(
    function () {
      for (const key of keys) {
        void query(key)
      }
    },
    [query, keys]
  )
}
