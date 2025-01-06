import { it, describe } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createQuery } from 'query:index'
import { useQueryInstance } from './useQueryInstance'
import { QueryProvider } from 'query/react:components/QueryProvider'
import { PropsWithChildren } from 'react'

describe('useQueryInstance', function () {
  it.concurrent('uses the options value', ({ expect }) => {
    const query = createQuery()
    const { result } = renderHook(() => useQueryInstance({ query }))

    expect(result.current).toBe(query)
  })

  it.concurrent('uses the options value when context is present', ({ expect }) => {
    function wrapper({ children }: PropsWithChildren) {
      return <QueryProvider>{children}</QueryProvider>
    }

    const query = createQuery()
    const { result } = renderHook(() => useQueryInstance({ query }), { wrapper })

    expect(result.current).toBe(query)
  })

  it.concurrent('uses the context value', ({ expect }) => {
    function wrapper({ children }: PropsWithChildren) {
      return <QueryProvider>{children}</QueryProvider>
    }

    const { result } = renderHook(() => useQueryInstance(), { wrapper })

    expect(result.current).toBeDefined()
  })

  it.concurrent('throws when no query is found', ({ expect }) => {
    expect(function () {
      renderHook(() => useQueryInstance())
    }).toThrow()
  })
})
