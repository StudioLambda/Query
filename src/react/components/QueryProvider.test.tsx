import { it } from 'vitest'
import { QueryProvider } from 'query/react:components/QueryProvider'
import { useQuery } from 'query/react:hooks/useQuery'
import { act, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createQuery } from 'query:index'

it.concurrent('can replace fetcher', async ({ expect }) => {
  interface User {
    email: string
  }

  function Component() {
    const { data } = useQuery<User>('/user')

    return <p>{data.email}</p>
  }

  const user: User = { email: 'testing@example.com' }

  function fetcher() {
    return Promise.resolve(user)
  }

  const container = document.createElement('div')
  const query = createQuery({ fetcher })
  const promise = query.once('/user', 'refetching')

  // eslint-disable-next-line
  await act(async function () {
    createRoot(container).render(
      <QueryProvider query={query}>
        <Suspense fallback={<div>Loading...</div>}>
          <Component />
        </Suspense>
      </QueryProvider>
    )
  })

  await act(async function () {
    await promise
  })

  expect(container.innerText).toBe(user.email)
})
