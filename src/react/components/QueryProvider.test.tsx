import { it } from 'vitest'
import { QueryProvider } from 'query/react:components/QueryProvider'
import { render, waitFor } from '@testing-library/react'
import { useQuery } from 'query/react:hooks/useQuery'
import { PropsWithChildren, Suspense } from 'react'

interface User {
  email: string
}

function Component() {
  const { data } = useQuery<User>('/user')

  return <p>{data.email}</p>
}

it.concurrent('can replace fetcher', async ({ expect }) => {
  const user: User = { email: 'testing@example.com' }

  function fetcher() {
    return Promise.resolve(user)
  }

  function wrapper({ children }: PropsWithChildren) {
    return (
      <QueryProvider fetcher={fetcher}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
      </QueryProvider>
    )
  }

  const result = render(<Component />, { wrapper })
  const element = await waitFor(async () => await result.findByRole('paragraph'))

  expect(element.innerText).toBe(user.email)
})
