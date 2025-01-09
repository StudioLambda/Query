import { describe, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useQuery } from 'query/react:hooks/useQuery'
import { createQuery } from 'query:index'
import { PropsWithChildren, Suspense } from 'react'

interface User {
  email: string
}

describe('useQuery', function () {
  it.concurrent('can query data', async ({ expect }) => {
    const user: User = { email: 'testing@example.com' }

    function fetcher() {
      return Promise.resolve(user)
    }

    function wrapper({ children }: PropsWithChildren) {
      return <Suspense fallback="loading">{children} </Suspense>
    }

    const query = createQuery({ fetcher })
    const container = document.createElement('div')

    const { result } = renderHook(() => useQuery<User>('/user', { query }), { wrapper, container })

    async function action() {
      await waitFor(
        () => {
          expect(result.current).not.toBeUndefined()
          expect(result.current).not.toBeNull()
        },
        { timeout: 5000 }
      )
    }

    await action().finally(() => {
      console.log('YEAA')
    })

    console.log(result.current)
    expect(result.current.data).toBe(user.email)
  })
})
