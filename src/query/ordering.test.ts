import { describe, it, vi } from 'vitest'
import { createQuery } from 'query:index'

describe.concurrent('cache write ordering', () => {
  it('keeps a completed mutation when an earlier fetch resolves', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => fetch.promise })
    const resolved = vi.fn<() => void>()
    client.subscribe('key', 'resolved', resolved)

    const pending = client.query('key')
    await client.mutate('key', 'saved', { expiration: () => 60000 })
    const expiresAt = client.expiration('key')
    fetch.resolve('older')

    expect(await pending).toBe('older')
    expect(await client.snapshot('key')).toBe('saved')
    expect(client.expiration('key')).toBe(expiresAt)
    expect(resolved).not.toHaveBeenCalled()
    expect(client.keys('resolvers')).toEqual([])
  })

  it('keeps hydration when an earlier fetch resolves', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => fetch.promise })
    const resolved = vi.fn<() => void>()
    client.subscribe('key', 'resolved', resolved)

    const pending = client.query('key')
    client.hydrate('key', 'hydrated', { expiration: () => 60000 })
    fetch.resolve('older')
    await pending

    expect(await client.snapshot('key')).toBe('hydrated')
    expect(resolved).not.toHaveBeenCalled()
  })

  it('serializes parallel functional mutations against committed values', async ({ expect }) => {
    const firstValue = Promise.withResolvers<number>()
    const started = Promise.withResolvers<void>()
    const client = createQuery()
    client.hydrate('key', 0)

    const first = client.mutate<number>('key', async (old) => {
      started.resolve()
      return (old ?? 0) + (await firstValue.promise)
    })
    await started.promise
    const second = client.mutate<number>('key', (old) => (old ?? 0) + 1)
    firstValue.resolve(1)

    expect(await Promise.all([first, second])).toEqual([1, 2])
    expect(await client.snapshot('key')).toBe(2)
  })

  it('continues queued mutations after a mutation rejects', async ({ expect }) => {
    const firstValue = Promise.withResolvers<number>()
    const client = createQuery()
    client.hydrate('key', 0)

    const first = client.mutate('key', () => firstValue.promise)
    const rejected = expect(first).rejects.toThrow('mutation failed')
    const second = client.mutate<number>('key', (old) => (old ?? 0) + 1)
    firstValue.reject(new Error('mutation failed'))

    await rejected
    expect(await second).toBe(1)
    expect(await client.snapshot('key')).toBe(1)
    expect(await client.mutate<number>('key', (old) => (old ?? 0) + 1)).toBe(2)
  })

  it('preserves call order for value mutations queued behind functional mutations', async ({
    expect,
  }) => {
    const firstValue = Promise.withResolvers<number>()
    const client = createQuery()
    client.hydrate('key', 0)

    const first = client.mutate('key', () => firstValue.promise)
    const second = client.mutate('key', 5)
    firstValue.resolve(1)

    expect(await Promise.all([first, second])).toEqual([1, 5])
    expect(await client.snapshot('key')).toBe(5)
  })

  it('recovers the queue when expiration calculation throws', async ({ expect }) => {
    const client = createQuery()
    client.hydrate('key', 0)
    const first = client.mutate('key', 9, {
      expiration: () => {
        throw new Error('expiration failed')
      },
    })
    const second = client.mutate<number>('key', (old) => (old ?? 0) + 1)

    await expect(first).rejects.toThrow('expiration failed')
    expect(await second).toBe(1)
    expect(await client.snapshot('key')).toBe(1)
  })

  it('does not remove a mutation when a superseded fetch rejects', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => fetch.promise, removeOnError: true })
    const error = vi.fn<() => void>()
    client.subscribe('key', 'error', error)

    const pending = client.query('key')
    const rejected = expect(pending).rejects.toThrow('fetch failed')
    await client.mutate('key', 'saved', { expiration: () => 60000 })
    fetch.reject(new Error('fetch failed'))

    await rejected
    expect(await client.snapshot('key')).toBe('saved')
    expect(error).not.toHaveBeenCalled()
    expect(client.keys('resolvers')).toEqual([])
  })

  it('does not supersede a fetch when a mutation fails', async ({ expect }) => {
    const fetch = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => fetch.promise })
    const pending = client.query('key')

    await expect(
      client.mutate('key', () => {
        throw new Error('mutation failed')
      })
    ).rejects.toThrow('mutation failed')
    fetch.resolve('fetched')
    await pending

    expect(await client.snapshot('key')).toBe('fetched')
  })

  it('allows revalidation after a default-expiration mutation before the old fetch settles', async ({
    expect,
  }) => {
    const older = Promise.withResolvers<string>()
    const newer = Promise.withResolvers<string>()
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise)
    const client = createQuery({ fetcher })
    const pending = client.query('key')
    await client.mutate('key', 'saved')
    const refetch = client.query('key', { stale: false })

    older.resolve('older')
    await pending
    expect(await client.snapshot('key')).toBe('saved')
    expect(client.keys('resolvers')).toEqual(['key'])
    newer.resolve('newer')

    expect(await refetch).toBe('newer')
    expect(await client.snapshot('key')).toBe('newer')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not block mutations or supersede fetches on other keys', async ({ expect }) => {
    const mutation = Promise.withResolvers<number>()
    const fetch = Promise.withResolvers<string>()
    const client = createQuery({ fetcher: () => fetch.promise })
    const pending = client.query('other-fetch')
    const first = client.mutate('blocked', () => mutation.promise)

    expect(await client.mutate('other-mutation', 2)).toBe(2)
    fetch.resolve('independent')
    await pending
    expect(await client.snapshot('other-fetch')).toBe('independent')

    mutation.resolve(1)
    expect(await first).toBe(1)
  })

  it('keeps a later resolver when a superseded fetch rejects', async ({ expect }) => {
    const older = Promise.withResolvers<string>()
    const newer = Promise.withResolvers<string>()
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise)
    const client = createQuery({ fetcher, removeOnError: true })
    const pending = client.query('key')
    const rejected = expect(pending).rejects.toThrow('old failure')
    await client.mutate('key', 'saved')
    const refetch = client.query('key', { stale: false })

    older.reject(new Error('old failure'))
    await rejected
    expect(await client.snapshot('key')).toBe('saved')
    expect(client.keys('resolvers')).toEqual(['key'])
    newer.resolve('newer')

    expect(await refetch).toBe('newer')
    expect(await client.snapshot('key')).toBe('newer')
  })
})
