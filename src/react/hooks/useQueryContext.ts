import { Context, type ContextValue } from 'query/react:context'
import { use, useDebugValue } from 'react'

export function useQueryContext(): ContextValue {
  useDebugValue('useQueryContext')

  return use(Context)
}
