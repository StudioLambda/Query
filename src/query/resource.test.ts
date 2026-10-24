import { describe, it, vi } from 'vitest'
import { createQuery } from './query'
import { type FetcherFunction } from './options'

describe.concurrent('instance-owned fresh resources', () => {
  it('keeps a hydrated resource when its superseded initial fetch completes', async ({
    expect,
  }) => {
    /** The original caller still receives its result without publishing it. */
    const pending = Promise.withResolvers<string>()
    const instance = createQuery({ fetcher: () => pending.promise, fresh: true })
    const resource = instance.resource('/hydrated-resource')
    const original = resource.promise
    instance.hydrate('/hydrated-resource', 'hydrated')
    const hydrated = resource.promise
    await expect(hydrated).resolves.toBe('hydrated')
    pending.resolve('obsolete')
    await expect(original).resolves.toBe('obsolete')
    expect(resource.promise).toBe(hydrated)
    expect(instance.caches().items.get('/hydrated-resource')!.item).toBe(hydrated)
    expect(instance.keys('resolvers')).toEqual([])
  })

  it('keeps the replacement resource and resolver after an obsolete request rejects', async ({
    expect,
  }) => {
    /** An obsolete request may reject after a replacement has taken ownership. */
    const obsolete = Promise.withResolvers<string>()
    const replacement = Promise.withResolvers<string>()
    const error = new Error('obsolete request failed')
    const fetcher = vi
      .fn<FetcherFunction<string>>()
      .mockReturnValueOnce(obsolete.promise)
      .mockReturnValueOnce(replacement.promise)
    const instance = createQuery({ fetcher, fresh: true })
    const resource = instance.resource('/ownership')
    const rejected = expect(resource.promise).rejects.toBe(error)
    const current = instance.query('/ownership', { fresh: true })
    obsolete.reject(error)
    await rejected
    expect(instance.query('/ownership', { fresh: false })).toBe(current)
    expect(resource.promise).toBe(current)
    replacement.resolve('current')
    await expect(current).resolves.toBe('current')
    expect(instance.caches().items.get('/ownership')?.item).toBe(current)
    expect(resource.promise).toBe(current)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('shares a request until its final committed consumer releases it', async ({ expect }) => {
    const fetcher = vi.fn<FetcherFunction<string>>(async () => 'value')
    const instance = createQuery({ fetcher, fresh: true, expiration: () => 0 })
    const resource = instance.resource('/resource')
    const firstRelease = resource.retain()
    const secondRelease = resource.retain()
    await resource.promise
    firstRelease()
    await Promise.resolve()
    expect(instance.resource('/resource')).toBe(resource)
    secondRelease()
    await Promise.resolve()
    const next = instance.resource('/resource')
    expect(next).not.toBe(resource)
    await next.promise
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps ordinary expiration and imperative freshness unchanged', async ({ expect }) => {
    const fetcher = vi.fn<FetcherFunction<string>>(async () => 'value')
    const instance = createQuery({ fetcher, expiration: () => 0, stale: false })
    await instance.resource('/resource').promise
    await instance.resource('/resource').promise
    expect(fetcher).toHaveBeenCalledTimes(2)

    const first = instance.resource('/resource', { fresh: true })
    await first.promise
    await instance.query('/resource', { fresh: true })
    expect(instance.resource('/resource', { fresh: true })).toBe(first)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('shares the first fresh reader options rather than sibling fetchers', async ({ expect }) => {
    const firstFetcher = vi.fn<FetcherFunction<string>>(async () => 'first')
    const siblingFetcher = vi.fn<FetcherFunction<string>>(async () => 'sibling')
    const instance = createQuery({ fresh: true })
    const first = instance.resource('/resource', { fetcher: firstFetcher })
    const sibling = instance.resource('/resource', { fetcher: siblingFetcher })
    expect(sibling).toBe(first)
    await expect(sibling.promise).resolves.toBe('first')
    expect(siblingFetcher).not.toHaveBeenCalled()
  })

  it('updates active resources on hydration and mutation', async ({ expect }) => {
    const instance = createQuery({ fetcher: async () => 'first', fresh: true })
    const resource = instance.resource<string>('/resource')
    await resource.promise
    instance.hydrate('/resource', 'hydrated')
    await expect(resource.promise).resolves.toBe('hydrated')
    await instance.mutate('/resource', 'mutated')
    await expect(resource.promise).resolves.toBe('mutated')
    expect(instance.resource('/resource')).toBe(resource)
  })

  it('forgets abandoned pending resources by key, pattern and all keys', async ({ expect }) => {
    const fetcher = vi.fn<FetcherFunction<string>>(() => new Promise(() => {}))
    const instance = createQuery({ fetcher, fresh: true })
    const keyed = instance.resource('/key')
    await instance.forget('/key')
    expect(instance.resource('/key')).not.toBe(keyed)
    const patterned = instance.resource('/pattern')
    await instance.forget(/^\/pattern$/)
    expect(instance.resource('/pattern')).not.toBe(patterned)
    const all = instance.resource('/all')
    await instance.forget()
    expect(instance.resource('/all')).not.toBe(all)
    instance.abort()
  })

  it('invalidates old selections when the instance is reconfigured', async ({ expect }) => {
    const instance = createQuery({ fetcher: async () => 'first', fresh: true })
    const first = instance.resource('/resource')
    await first.promise
    instance.configure({ fetcher: async () => 'second' })
    const second = instance.resource('/resource')
    expect(second).not.toBe(first)
    await expect(second.promise).resolves.toBe('second')
  })

  it('preserves selections during notification-only configuration', async ({ expect }) => {
    const instance = createQuery({ fetcher: async () => 'first', fresh: true })
    const resource = instance.resource('/resource')
    await resource.promise
    instance.configure({ events: new EventTarget() })
    expect(instance.resource('/resource')).toBe(resource)
    instance.configure()
    expect(instance.resource('/resource')).toBe(resource)
  })

  it('retains rejected requests for retries until explicitly invalidated', async ({ expect }) => {
    const error = new Error('failed')
    const fetcher = vi.fn<FetcherFunction<string>>(async () => {
      throw error
    })
    const instance = createQuery({ fetcher, fresh: true })
    const resource = instance.resource('/resource')
    await expect(resource.promise).rejects.toBe(error)
    expect(instance.resource('/resource')).toBe(resource)
    await instance.forget('/resource')
    fetcher.mockResolvedValue('recovered')
    await expect(instance.resource('/resource').promise).resolves.toBe('recovered')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('lets an imperative fresh query replace and abort a pending render request', async ({
    expect,
  }) => {
    const pending = Promise.withResolvers<string>()
    const replacement = Promise.withResolvers<string>()
    const signals: AbortSignal[] = []
    const fetcher = vi.fn<FetcherFunction<string>>((_key, { signal }) => {
      signals.push(signal)
      return signals.length === 1 ? pending.promise : replacement.promise
    })
    const instance = createQuery({ fetcher, fresh: true })
    const resource = instance.resource('/resource')
    const original = resource.promise
    const rejection = expect(original).rejects.toBeInstanceOf(DOMException)
    const refreshed = instance.query('/resource', { fresh: true })
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
    expect(resource.promise).toBe(refreshed)
    pending.resolve('discarded')
    replacement.resolve('replacement')
    await rejection
    await expect(refreshed).resolves.toBe('replacement')
    await expect(resource.promise).resolves.toBe('replacement')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('keeps a committed selection when an explicit refresh fails', async ({ expect }) => {
    const fetcher = vi.fn<FetcherFunction<string>>(async () => 'first')
    const instance = createQuery({ fetcher, fresh: true })
    const resource = instance.resource('/resource')
    await resource.promise
    const release = resource.retain()
    const successful = resource.promise
    fetcher.mockRejectedValue(new Error('refresh failed'))
    await expect(instance.query('/resource', { fresh: true })).rejects.toThrow('refresh failed')
    expect(resource.promise).toBe(successful)
    await expect(resource.promise).resolves.toBe('first')
    release()
  })
})
