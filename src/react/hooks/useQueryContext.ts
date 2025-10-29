import { Context, type ContextValue } from 'query/react:context'
import { use } from 'react'

export function useQueryContext(): ContextValue {
  return use(Context)
}
