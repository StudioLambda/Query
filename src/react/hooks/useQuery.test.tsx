import { describe, it } from 'vitest'
import { useQuery } from 'query/react:hooks/useQuery'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

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
      const { data } = useQuery<string>('/user', options)

      return data
    }

    const container = document.createElement('div')

    const promise = query.once('/user', 'refetching')

    // eslint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    await act(async function () {
      await promise
    })

    expect(container.innerText).toBe('works')
  })
})
