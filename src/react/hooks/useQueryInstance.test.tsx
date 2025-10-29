import { describe, it } from 'vitest'
import { createQuery } from 'query:index'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrNoQueryInstanceFound, useQueryInstance } from './useQueryInstance'
import { ErrorBoundary } from 'react-error-boundary'

describe.concurrent('useQueryInstance', function () {
  it('can get a query instance', async ({ expect }) => {
    function fetcher(key: string) {
      return Promise.resolve(key)
    }

    const query = createQuery({ fetcher })
    const options = { query }

    function Component() {
      const query = useQueryInstance(options)
      expect(query).not.toBeNull()

      return null
    }

    const container = document.createElement('div')

    // eslint-disable-next-line
    await act(async function () {
      createRoot(container).render(
        <Suspense fallback="loading">
          <Component />
        </Suspense>
      )
    })
  })

  it('can throws if no query instance is found', async ({ expect }) => {
    function Component() {
      const query = useQueryInstance()
      expect(query).toBeNull()

      return null
    }

    const container = document.createElement('div')
    let err: Error | undefined = undefined

    // eslint-disable-next-line
    await act(async function () {
      function onError(e: Error) {
        err = e
      }

      createRoot(container).render(
        <ErrorBoundary fallback={<></>} onError={onError}>
          <Suspense fallback="loading">
            <Component />
          </Suspense>
        </ErrorBoundary>
      )
    })

    expect(err).toBeDefined()
    expect(err).toEqual(new Error(ErrNoQueryInstanceFound))
  })
})
