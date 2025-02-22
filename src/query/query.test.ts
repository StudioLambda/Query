import { it, vi } from 'vitest'
import { createQuery, defaultFetcher, FetcherAdditional } from 'query:index'

it.concurrent('can query resources', async ({ expect }) => {
  async function fetcher(key: string) {
    await new Promise((r) => setTimeout(r, 200))

    return key
  }

  const { query } = createQuery({ fetcher })

  const promise = query<string>('example-key')
  const promise2 = query<string>('example-key2')

  const [resource, resource2] = await Promise.all([promise, promise2])

  expect(resource).toBe('example-key')
  expect(resource2).toBe('example-key2')
})

it.concurrent('can fetch expired resources while returning stale', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query } = createQuery({ fetcher, expiration: () => 100 })

  await query<string>('example-key')

  await new Promise((resolve) => {
    setTimeout(resolve, 100)
  })

  const resource = await query<string>('example-key')

  expect(resource).toBe('example')
})

it.concurrent('can fetch expired resources while not returning stale', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query } = createQuery({ fetcher, expiration: () => 100 })

  await query<string>('example-key')
  await new Promise((r) => setTimeout(r, 100))
  const resource = await query<string>('example-key', { stale: false })

  expect(resource).toBe('example')
})

it.concurrent('returns the same promise when resources are resolving', async ({ expect }) => {
  let times = 0
  async function fetcher() {
    await new Promise((r) => setTimeout(r, 200))
    times++
    return 'example'
  }

  const { query } = createQuery({ fetcher })

  void query<string>('example-key')
  await query<string>('example-key')

  expect(times).toBe(1)
})

it.concurrent('does respect dedupe interval of resources', async ({ expect }) => {
  let times = 0
  function fetcher() {
    times++
    return Promise.resolve('example')
  }

  const { query } = createQuery({ fetcher, expiration: () => 0 })

  await query<string>('example-key')
  await new Promise((r) => setTimeout(r, 100))
  await query<string>('example-key')

  expect(times).toBe(2)
})

it.concurrent('does respect dedupe interval of resources 2', async ({ expect }) => {
  let times = 0
  function fetcher() {
    times++
    return Promise.resolve('example')
  }

  const { query } = createQuery({ fetcher, expiration: () => 100 })

  await query<string>('example-key')
  await query<string>('example-key')

  expect(times).toBe(1)
})

it.concurrent('can subscribe to refetchings on resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe } = createQuery({ fetcher, expiration: () => 0 })

  let result: Promise<string> | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'refetching',
    function (event: CustomEventInit<Promise<string>>) {
      result = event.detail
    }
  )
  await query('example-key', { fetcher })
  unsubscribe()

  expect(result).not.toBeUndefined()
  await expect(result).resolves.toBe('example')
})

it.concurrent('can subscribe to refetchings on pending resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe } = createQuery({ fetcher, expiration: () => 0 })
  const r = query('example-key', { fetcher })

  let result: Promise<string> | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'refetching',
    function (event: CustomEventInit<Promise<string>>) {
      result = event.detail
    }
  )
  await r
  unsubscribe()

  expect(result).not.toBeUndefined()
  await expect(result).resolves.toBe('example')
})

it.concurrent('can subscribe to resolutions on resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe } = createQuery({ fetcher, expiration: () => 0 })

  let result: string | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'resolved',
    function (event: CustomEventInit<string>) {
      result = event.detail
    }
  )

  await query('example-key', { fetcher })
  unsubscribe()

  expect(result).toBe('example')
})

it.concurrent('can subscribe to mutations on resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe, mutate } = createQuery({ fetcher })

  const current = await query('example-key', { fetcher })

  expect(current).toBe('example')

  let result: string | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'mutated',
    function (event: CustomEventInit<string>) {
      result = event.detail
    }
  )

  const res = await mutate('example-key', 'mutated-example')
  unsubscribe()

  expect(result).toBe('mutated-example')
  expect(result).toBe(res)
})

it.concurrent('can mutate non-existing cache keys when using a fn', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, mutate } = createQuery({ fetcher })

  const current = await query('example-key', { fetcher })

  expect(current).toBe('example')

  await mutate('example-key-2', () => 'mutated-example')

  const result = await query('example-key-2', { fetcher })

  expect(result).toBe('mutated-example')
})

it.concurrent('can subscribe to mutations on resources 2', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve(1)
  }

  const { query, subscribe, mutate } = createQuery({ fetcher })

  const current = await query('example-key', { fetcher })

  expect(current).toBe(1)

  let result: number | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'mutated',
    function (event: CustomEventInit<number>) {
      result = event.detail
    }
  )

  const second = await mutate<number>('example-key', (old) => (old ?? 0) + 1)
  unsubscribe()

  expect(second).toBe(2)
  expect(result).toBeDefined()
  expect(result).toBe(2)
})

it.concurrent('can subscribe to aborts on resources', async ({ expect }) => {
  const err = new Error('aborted')

  function fetcher(_key: string, { signal }: FetcherAdditional) {
    return new Promise(function (resolve, reject) {
      signal.addEventListener('abort', function () {
        reject(err)
      })
      void new Promise((r) => setTimeout(r, 200)).then(function () {
        resolve('example')
      })
    })
  }

  const { query, subscribe, abort } = createQuery({ fetcher, expiration: () => 0 })

  let result = undefined
  const unsubscribe = subscribe(
    'example-key',
    'aborted',
    function (event: CustomEventInit<Promise<string>>) {
      result = event.detail
    }
  )

  const r = query('example-key', { fetcher })
  abort()
  unsubscribe()

  await expect(() => r).rejects.toThrowError(err)
  expect(result).toBeNull()
})

it.concurrent('can subscribe to aborts on resources with custom reason', async ({ expect }) => {
  const err = new Error('aborted')

  function fetcher(_key: string, { signal }: FetcherAdditional) {
    return new Promise(function (resolve, reject) {
      signal.addEventListener('abort', function () {
        reject(err)
      })
      void new Promise((r) => setTimeout(r, 200)).then(function () {
        resolve('example')
      })
    })
  }

  const { query, subscribe, abort } = createQuery({ fetcher, expiration: () => 0 })

  let result = undefined
  const unsubscribe = subscribe(
    'example-key',
    'aborted',
    function (event: CustomEventInit<Promise<string>>) {
      result = event.detail
    }
  )

  const r = query('example-key', { fetcher })
  abort(undefined, 'failed')
  unsubscribe()

  await expect(r).rejects.toThrowError(err)
  expect(result).toEqual('failed')
})

it.concurrent('can subscribe to forgets on resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe, forget, keys } = createQuery({ fetcher })

  const current = await query('example-key', { fetcher })

  expect(current).toBe('example')

  let result: string | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'forgotten',
    function (event: CustomEventInit<string>) {
      result = event.detail
    }
  )

  await forget('example-key')
  unsubscribe()

  expect(result).toBeDefined()
  expect(result).toBe('example')
  expect(keys('items')).toHaveLength(0)
})

it.concurrent('can subscribe to hydrates on resources', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, subscribe, hydrate, keys } = createQuery({ fetcher })

  const current = await query('example-key', { fetcher })

  expect(current).toBe('example')

  let result: string | undefined = undefined
  const unsubscribe = subscribe(
    'example-key',
    'hydrated',
    function (event: CustomEventInit<string>) {
      result = event.detail
    }
  )

  hydrate('example-key', 'hydrated-example')
  unsubscribe()

  expect(result).toBe('hydrated-example')
  expect(keys('items')).toHaveLength(1)
})

it.concurrent('can reconfigure query', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, configure } = createQuery({ fetcher })

  configure({
    itemsCache: new Map(),
    resolversCache: new Map(),
    events: new EventTarget(),
    expiration() {
      return 5000
    },
    stale: false,
    fetcher() {
      return Promise.resolve('different')
    },
    removeOnError: true,
    fresh: true,
  })

  const result = await query('some-key')

  expect(result).toBe('different')
})

it.concurrent('can reconfigure query 2', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, configure } = createQuery({ fetcher })

  configure()

  const result = await query('some-key')

  expect(result).toBe('example')
})

it.concurrent('can abort query', async ({ expect }) => {
  const err = new Error('aborted')

  function fetcher(_key: string, { signal }: FetcherAdditional) {
    return new Promise(function (resolve, reject) {
      signal.addEventListener('abort', function () {
        reject(err)
      })
      void new Promise((r) => setTimeout(r, 200)).then(function () {
        resolve('example')
      })
    })
  }

  const { query, abort } = createQuery({ fetcher })
  const result = query<string>('example-key')
  abort('example-key')

  await expect(() => result).rejects.toThrowError(err)
})

it.concurrent('can abort query 2', async ({ expect }) => {
  const err = new Error('aborted')

  function fetcher(_key: string, { signal }: FetcherAdditional) {
    return new Promise(function (resolve, reject) {
      signal.addEventListener('abort', function () {
        reject(err)
      })
      void new Promise((r) => setTimeout(r, 200)).then(function () {
        resolve('example')
      })
    })
  }

  const { query, abort } = createQuery({ fetcher })
  const result = query<string>('example-key')
  abort(['example-key'])

  await expect(() => result).rejects.toThrowError(err)
})

it.concurrent('can abort query 3', async ({ expect }) => {
  const err = new Error('aborted')

  function fetcher(_key: string, { signal }: FetcherAdditional) {
    return new Promise(function (resolve, reject) {
      signal.addEventListener('abort', function () {
        reject(err)
      })
      void new Promise((r) => setTimeout(r, 200)).then(function () {
        resolve('example')
      })
    })
  }

  const { query, abort } = createQuery({ fetcher })
  const result = query<string>('example-key')
  abort()

  await expect(() => result).rejects.toThrowError(err)
})

it.concurrent('can get the item keys of a query', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, keys } = createQuery({ fetcher })
  await query<string>('foo')
  await query<string>('bar')
  const items = keys('items')

  expect(items).toHaveLength(2)
  expect(items).toContain('foo')
  expect(items).toContain('bar')
})

it.concurrent('can get the resolvers keys of a query', ({ expect }) => {
  async function fetcher() {
    await new Promise((r) => setTimeout(r, 250))
    return 'example'
  }

  const { query, keys } = createQuery({ fetcher })
  void query<string>('foo')
  void query<string>('bar')
  const resolvers = keys('resolvers')

  expect(resolvers).toHaveLength(2)
  expect(resolvers).toContain('foo')
  expect(resolvers).toContain('bar')
})

it.concurrent('can forget a query key', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, forget, keys } = createQuery({ fetcher })
  await query<string>('example-key')

  expect(keys('items')).toContain('example-key')
  await forget('example-key')
  expect(keys('items')).toHaveLength(0)
})

it.concurrent('can forget a query key 2', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, forget, keys } = createQuery({ fetcher })
  await query<string>('example-key')

  expect(keys('items')).toContain('example-key')
  await forget(['example-key'])
  expect(keys('items')).toHaveLength(0)
})

it.concurrent('can forget a query key 3', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('example')
  }

  const { query, forget, keys } = createQuery({ fetcher })
  await query<string>('example-key')

  expect(keys('items')).toContain('example-key')
  await forget()
  expect(keys('items')).toHaveLength(0)
})

it.concurrent('removes resolver when query fails', async ({ expect }) => {
  function fetcher(): Promise<string> {
    throw new Error('foo')
  }

  function fetcher2() {
    return Promise.resolve('example')
  }

  const { query } = createQuery({ expiration: () => 0 })

  await expect(query<string>('example-key', { fetcher })).rejects.toThrowError('foo')
  await expect(query<string>('example-key', { fetcher: fetcher2 })).resolves.toBe('example')
})

it.concurrent('removes items if specified when query fails', async ({ expect }) => {
  function fetcher(): Promise<string> {
    throw new Error('foo')
  }

  function fetcher2() {
    return Promise.resolve('example')
  }

  const { query, keys } = createQuery({ expiration: () => 0 })

  await query<string>('example-key', { fetcher: fetcher2 })
  expect(keys('items')).toContain('example-key')
  await expect(
    query<string>('example-key', { fetcher, stale: false, removeOnError: true })
  ).rejects.toThrowError('foo')
  expect(keys('items')).not.toContain('example-key')
})

it.concurrent('can subscribe to errors', async ({ expect }) => {
  function fetcher(): Promise<string> {
    throw new Error('foo')
  }

  const { query, subscribe } = createQuery({ fetcher, expiration: () => 0 })

  let err: Error | undefined
  subscribe('example-key', 'error', function (event: CustomEventInit<Error>) {
    err = event.detail
  })

  await expect(query<string>('example-key')).rejects.toThrowError('foo')
  expect(err).toBeDefined()
  expect(err?.message).toBe('foo')
})

it.concurrent('can give a fresh instance if needed', async ({ expect }) => {
  let times = 0
  function fetcher() {
    times++
    return Promise.resolve('example')
  }

  const { query } = createQuery({ fetcher, expiration: () => 1000 })

  await query('example-key')
  expect(times).toBe(1)
  await query('example-key')
  expect(times).toBe(1)
  await query('example-key', { fresh: true })
  expect(times).toBe(2)
})

it.concurrent('uses stale data while resolving', async ({ expect }) => {
  function fetcher(slow?: boolean) {
    return async function () {
      if (slow) await new Promise((r) => setTimeout(r, 100))
      return `example-${slow ? 'slow' : 'fast'}`
    }
  }

  const { query } = createQuery({ expiration: () => 0 })

  const data = await query('example-key', { fetcher: fetcher(false) })
  expect(data).toBe('example-fast')

  const data2 = await query('example-key', { fetcher: fetcher(true) })
  expect(data2).toBe('example-fast')

  const data3 = await query('example-key', { fetcher: fetcher(true) })
  expect(data3).toBe('example-fast')

  await new Promise((r) => setTimeout(r, 100))

  const data4 = await query('example-key', { fetcher: fetcher(true) })
  expect(data4).toBe('example-slow')
})

it.concurrent('can get expiration date of items', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('foo')
  }

  const { query, expiration } = createQuery({ fetcher })

  await query('example-key')

  expect(expiration('bad-key')).toBeUndefined()
  expect(expiration('example-key')).toBeInstanceOf(Date)
})

it.concurrent('can hydrate keys', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('foo')
  }

  const { query, hydrate } = createQuery({ fetcher, expiration: () => 1000 })

  hydrate('example-key', 'bar', {
    expiration: () => 1000,
  })

  const result = await query('example-key')
  const result2 = await query('example-key')

  expect(result).toBe('bar')
  expect(result2).toBe('bar')
})

it.concurrent('can hydrate keys without expiration', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('foo')
  }

  const { query, hydrate } = createQuery({ fetcher, expiration: () => 1000 })

  hydrate('example-key', 'bar')
  // Stale hydrated result (because no expiration given)
  const result = await query('example-key')
  const result2 = await query('example-key')

  expect(result).toBe('bar')
  expect(result2).toBe('foo')
})

it.concurrent('can hydrate multiple keys', async ({ expect }) => {
  function fetcher() {
    return Promise.resolve('foo')
  }

  const { query, hydrate } = createQuery({ fetcher, expiration: () => 1000 })

  hydrate(['example-key', 'example-key2'], 'bar', {
    expiration: () => 1000,
  })

  const result = await query('example-key')
  const result2 = await query('example-key2')
  const result3 = await query('example-key')
  const result4 = await query('example-key2')

  expect(result).toBe('bar')
  expect(result2).toBe('bar')
  expect(result3).toBe('bar')
  expect(result4).toBe('bar')
})

it.concurrent('can use the default fetcher', async ({ expect }) => {
  const mockedFetch = vi.fn(fetch)

  mockedFetch.mockReturnValueOnce(
    Promise.resolve(new Response(JSON.stringify({ data: 'example' })))
  )

  const fetcher = defaultFetcher(mockedFetch)

  const { query } = createQuery({ fetcher })

  await expect(query<{ data: string }>('example')).resolves.toEqual({ data: 'example' })
})

it.concurrent('can use the default fetcher when fails', async ({ expect }) => {
  const mockedFetch = vi.fn(fetch)

  mockedFetch.mockReturnValueOnce(Promise.resolve(new Response(undefined, { status: 500 })))

  const fetcher = defaultFetcher(mockedFetch)

  const { query } = createQuery({ fetcher })

  await expect(query<{ data: string }>('example')).rejects.toThrowError()
})

it.concurrent('can use regex to forget the keys', async ({ expect }) => {
  const { hydrate, forget, keys } = createQuery()

  hydrate(['first', 'first/second', 'second/first', 'second'], 0)
  await forget(/^first(.*)/g)

  expect(keys('items')).toHaveLength(2)
  expect(keys('items')).not.toContain('first')
  expect(keys('items')).not.toContain('first/second')
  expect(keys('items')).toContain('second')
  expect(keys('items')).toContain('second/first')
})

it.concurrent('can listen to once events', async ({ expect }) => {
  const { events, once } = createQuery()

  const promise = once('/foo', 'resolved')
  const detail = 'works'

  events().dispatchEvent(new CustomEvent(`resolved:/foo`, { detail }))

  const event = await promise

  expect(event).toBeDefined()
  expect(event).toBeDefined()
})

it.concurrent('uses the same promises for the same result', async ({ expect }) => {
  async function fetcher() {
    await new Promise((r) => setTimeout(r, 100))
    return 'works'
  }

  const { query } = createQuery({ fetcher })

  const promise = query<string>('/')
  const promise2 = query<string>('/')

  expect(promise === promise2).toBeTruthy()

  await new Promise((r) => setTimeout(r, 150))

  const promise3 = query<string>('/')

  expect(promise === promise3).toBeTruthy()
})

it.concurrent('can use multiple queries', async function ({ expect }) {
  function fetcher(key: string) {
    return Promise.resolve(key)
  }

  const { query, next } = createQuery({ fetcher })

  const promise = next<[string, string]>(['/foo', '/bar'])

  await Promise.all([query('/foo'), query('/bar')])

  const [first, second] = await promise

  expect(first).toBe('/foo')
  expect(second).toBe('/bar')
})
