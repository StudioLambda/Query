import { describe, it } from 'vitest'
import { useQueryStatus } from 'query/react:hooks/useQueryStatus'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

describe.concurrent('useQueryStatus', function () {
  it('can read expiration status', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('data')
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }

    await query.query('/key')

    let status: ReturnType<typeof useQueryStatus> | undefined

    function Component() {
      status = useQueryStatus('/key', options)
      return null
    }

    const container = document.createElement('div')

    // oxlint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    expect(status).toBeDefined()
    expect(status!.expiresAt).toBeInstanceOf(Date)
    expect(status!.isExpired).toBe(false)
    expect(status!.isRefetching).toBe(false)
    expect(status!.isMutating).toBe(false)
  })

  it('reports expired status for expired items', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('data')
    }

    const query = createQuery({ fetcher, expiration: () => 0 })
    const options = { query }

    await query.query('/expired-key')

    let status: ReturnType<typeof useQueryStatus> | undefined

    function Component() {
      status = useQueryStatus('/expired-key', options)
      return null
    }

    const container = document.createElement('div')

    // oxlint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })

    expect(status).toBeDefined()
    expect(status!.isExpired).toBe(true)
  })
})
