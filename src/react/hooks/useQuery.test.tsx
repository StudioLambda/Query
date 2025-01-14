import { describe, it } from 'vitest'
import { useQuery } from 'query/react:hooks/useQuery'
import { createQuery, Query } from 'query:index'
import { act, Suspense, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryProvider } from 'query/react:components/QueryProvider'

// @ts-expect-error enable act environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('useQuery', function () {
  it('can query data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('works')
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      console.log('A')

      const { data } = useQuery<string>('/user')
      console.log('C')

      return data
    }

    console.log('D')
    const container = document.createElement('div')
    console.log('E')
    const promise = query.once('/user', 'refetching').then(() => {
      console.log('1')
    })
    const promise2 = query.once('/user', 'error').then(() => {
      console.log('2')
    })
    const promise3 = query.once('/user', 'resolved').then(() => {
      console.log('3')
    })

    console.log('F')
    await act(async function () {
      createRoot(container).render(
        <QueryProvider fetcher={fetcher}>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </QueryProvider>
      )

      console.log('G')

      // await promise
    })

    await act(async function () {
      console.log('H')
      await promise
      console.log('H2')
    })

    console.log('I')

    expect(container.innerText).toBe('works')
  })
})
