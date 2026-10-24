import { describe, it, vi } from 'vitest'
import { createQuery, type FetcherFunction } from 'query:index'

/**
 * Exercises overlapping requests without timers. Deferred fetches let each
 * test settle an obsolete request after a replacement owns the same key.
 */
describe.concurrent('request ownership', () => {
  it('keeps a fresh replacement deduplicated and abortable after the old abort rejects', async ({
    expect,
  }) => {
    /** Pending replacement and subsequent fetch, settled explicitly below. */
    const replacement = Promise.withResolvers<string>()
    /** Fetch after cancelling the replacement, used to check cache identity. */
    const subsequent = Promise.withResolvers<string>()
    /** The first fetch actually rejects when fresh aborts its signal. */
    const fetcher = vi
      .fn<FetcherFunction<string>>()
      .mockImplementationOnce((_key, { signal }) => {
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
      })
      .mockImplementationOnce(() => replacement.promise)
      .mockImplementationOnce(() => subsequent.promise)
    /** Instance under test, retaining successful results for identity checks. */
    const instance = createQuery({ fetcher, expiration: () => 10000 })
    /** Obsolete request rejection is observed before starting the replacement. */
    const original = instance.query('key')
    /** Attached immediately so abort rejection cannot become unhandled. */
    const originalRejected = expect(original).rejects.toBeInstanceOf(DOMException)
    /** Fresh must start a new request while the original is still pending. */
    const fresh = instance.query('key', { fresh: true })
    /** Capture the replacement controller to verify later cancellation. */
    const controller = instance.caches().resolvers.get('key')!.controller

    await originalRejected
    expect(instance.query('key')).toBe(fresh)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(instance.caches().resolvers.get('key')?.item).toBe(fresh)

    instance.abort('key', 'cancel replacement')
    expect(controller.signal.aborted).toBe(true)
    /** Observe the replacement rejection before releasing its deferred fetch. */
    const freshRejected = expect(fresh).rejects.toBe('cancel replacement')
    replacement.resolve('ignored')
    await freshRejected

    /** A later request must still be tracked, deduplicated and cached itself. */
    const next = instance.query('key')
    expect(instance.query('key')).toBe(next)
    subsequent.resolve('current')
    await expect(next).resolves.toBe('current')
    expect(instance.query('key')).toBe(next)
    expect(instance.caches().items.get('key')?.item).toBe(next)
    expect(instance.keys('resolvers')).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not remove a successful replacement or emit an error for a late obsolete failure', async ({
    expect,
  }) => {
    /** Original ignores abort until its deferred failure is explicitly released. */
    const originalFetch = Promise.withResolvers<string>()
    /** Replacement resolves before the obsolete request rejects. */
    const replacement = Promise.withResolvers<string>()
    /** Ordered fetch results expose the late removeOnError race. */
    const fetcher = vi
      .fn<FetcherFunction<string>>()
      .mockImplementationOnce(() => originalFetch.promise)
      .mockImplementationOnce(() => replacement.promise)
    /** removeOnError must only apply to the request that still owns the key. */
    const instance = createQuery({ fetcher, removeOnError: true, expiration: () => 10000 })
    /** Subscriber records only errors attributable to the current request. */
    const onError = vi.fn<() => void>()
    instance.subscribe('key', 'error', onError)
    /** Obsolete result remains rejected for its own caller. */
    const original = instance.query('key')
    /** Immediate rejection observer prevents an unhandled rejection. */
    const originalRejected = expect(original).rejects.toThrow('late failure')
    /** Successful replacement must survive the original rejection. */
    const fresh = instance.query('key', { fresh: true })
    replacement.resolve('current')
    await expect(fresh).resolves.toBe('current')

    originalFetch.reject(new Error('late failure'))
    await originalRejected

    expect(instance.query('key')).toBe(fresh)
    expect(await instance.snapshot('key')).toBe('current')
    expect(instance.caches().items.get('key')?.item).toBe(fresh)
    expect(instance.keys('resolvers')).toEqual([])
    expect(onError).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not cache another request promise when a resolver is replaced without abort', async ({
    expect,
  }) => {
    /** These requests overlap without abort through the exposed resolver cache. */
    const originalFetch = Promise.withResolvers<string>()
    /** Current fetch stays pending while the obsolete fetch succeeds. */
    const replacement = Promise.withResolvers<string>()
    /** Fetch results are released in request order. */
    const fetcher = vi
      .fn<FetcherFunction<string>>()
      .mockImplementationOnce(() => originalFetch.promise)
      .mockImplementationOnce(() => replacement.promise)
    /** Cache access is public and must not allow a stale request to steal ownership. */
    const instance = createQuery({ fetcher, expiration: () => 10000 })
    /** Caller still receives its own result after losing resolver ownership. */
    const original = instance.query('key')
    instance.caches().resolvers.delete('key')
    /** New resolver must remain pending and must not become an obsolete cache item. */
    const current = instance.query('key')
    originalFetch.resolve('obsolete')
    await expect(original).resolves.toBe('obsolete')

    expect(instance.caches().items.get('key')).toBeUndefined()
    expect(instance.caches().resolvers.get('key')?.item).toBe(current)
    expect(instance.query('key')).toBe(current)
    replacement.resolve('current')
    await expect(current).resolves.toBe('current')
    expect(instance.query('key')).toBe(current)
    expect(instance.caches().items.get('key')?.item).toBe(current)
    expect(instance.keys('resolvers')).toEqual([])
  })
})
