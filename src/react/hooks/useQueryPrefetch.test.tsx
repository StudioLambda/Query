import { describe, it } from 'vitest'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { useQueryPrefetch } from './useQueryPrefetch'

describe.concurrent('useQueryPrefetch', function () {
  it('can prefetch data', async ({ expect }) => {
    function fetcher(key: string) {
      return Promise.resolve(key)
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      useQueryPrefetch(['/user', '/config'], options)

      return null
    }

    const container = document.createElement('div')

    const promise = query.next<[string, string]>(['/user', '/config'])

    // eslint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    await act(async function () {
      const [user, config] = await promise
      expect(user).toBe('/user')
      expect(config).toBe('/config')
    })
  })
})
