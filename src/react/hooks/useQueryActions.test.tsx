import { describe, it } from 'vitest'
import { useQueryActions } from 'query/react:hooks/useQueryActions'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

describe('useQueryActions', function () {
  it('can refetch data', async ({ expect }) => {
    let fetchCount = 0

    function fetcher() {
      fetchCount++
      return Promise.resolve('value-' + fetchCount)
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }
    const actionsRef: { current: ReturnType<typeof useQueryActions<string>> | null } = {
      current: null,
    }

    function Component() {
      const actions = useQueryActions<string>('/refetch-key', options)
      actionsRef.current = actions
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

    expect(actionsRef.current).not.toBeNull()
    expect(fetchCount).toBe(0)

    const result = await actionsRef.current!.refetch()

    expect(result).toBe('value-1')
    expect(fetchCount).toBe(1)
  })

  it('can mutate data with correct types', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('initial')
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }
    const actionsRef: { current: ReturnType<typeof useQueryActions<string>> | null } = {
      current: null,
    }

    function Component() {
      const actions = useQueryActions<string>('/mutate-type-key', options)
      actionsRef.current = actions
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

    const result = await actionsRef.current!.mutate('new-value')

    expect(result).toBe('new-value')
  })

  it('can forget cached data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('data')
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }
    const actionsRef: { current: ReturnType<typeof useQueryActions<string>> | null } = {
      current: null,
    }

    // Pre-populate the cache so forget has something to remove.
    await query.query('/forget-action-key')

    function Component() {
      const actions = useQueryActions<string>('/forget-action-key', options)
      actionsRef.current = actions
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

    expect(actionsRef.current).not.toBeNull()
    expect(query.keys('items')).toContain('/forget-action-key')

    await actionsRef.current!.forget()

    expect(query.keys('items')).not.toContain('/forget-action-key')
  })
})
