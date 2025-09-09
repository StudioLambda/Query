import { describe, it } from 'vitest'
import { useQuery } from 'query/react:hooks/useQuery'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

describe('useQuery', function () {
  it('can query data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('works')
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      const { data } = useQuery<string>('/user', options)

      return data
    }

    const container = document.createElement('div')
    const promise = query.next<string>('/user')

    // eslint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    await act(async function () {
      const result = await promise

      expect(result).toBe('works')
    })

    expect(container.innerText).toBe('works')
  })
})
