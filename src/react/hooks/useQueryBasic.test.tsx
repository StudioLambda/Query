import { describe, it } from 'vitest'
import { useQueryBasic } from 'query/react:hooks/useQueryBasic'
import { createQuery } from 'query:index'
import { act, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'

describe('useQueryBasic', function () {
  it('can fetch and display data', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('hello')
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      const { data } = useQueryBasic<string>('/basic-fetch', options)

      return <p>{data}</p>
    }

    const container = document.createElement('div')
    const promise = query.next<string>('/basic-fetch')

    // oxlint-disable-next-line
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

    expect(container.innerText).toBe('hello')
  })

  it('updates data when key changes to a cached value', async ({ expect }) => {
    function fetcher(key: string) {
      return Promise.resolve(key)
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }

    let setKey: (key: string) => void = () => {}

    function Component() {
      const [key, localSetKey] = useState('/switch-a')
      setKey = localSetKey

      const { data } = useQueryBasic<string>(key, options)

      return <p>{data}</p>
    }

    const container = document.createElement('div')
    const promise = query.next<string>('/switch-a')

    // oxlint-disable-next-line
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

    expect(container.innerText).toBe('/switch-a')

    // Pre-populate the second key so the switch resolves instantly.
    query.hydrate('/switch-b', '/switch-b', { expiration: () => 10000 })

    // oxlint-disable-next-line
    await act(async function () {
      setKey('/switch-b')
    })

    expect(container.innerText).toBe('/switch-b')
  })

  it('updates data when hydrate event fires', async ({ expect }) => {
    function fetcher() {
      return Promise.resolve('initial')
    }

    const query = createQuery({ fetcher, expiration: () => 10000 })
    const options = { query }

    function Component() {
      const { data } = useQueryBasic<string>('/hydrate-basic', options)

      return <p>{data}</p>
    }

    const container = document.createElement('div')
    const promise = query.next<string>('/hydrate-basic')

    // oxlint-disable-next-line
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

    expect(container.innerText).toBe('initial')

    // oxlint-disable-next-line
    await act(async function () {
      query.hydrate('/hydrate-basic', 'updated', { expiration: () => 10000 })
    })

    // Allow transition to settle.
    await act(async function () {})

    expect(container.innerText).toBe('updated')
  })
})
