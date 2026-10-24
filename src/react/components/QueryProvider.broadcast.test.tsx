import { afterEach, describe, it, vi } from 'vitest'
import { act, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { createQuery } from 'query:index'
import { QueryProvider } from 'query/react:components/QueryProvider'

/**
 * Creates a caller-owned channel double with synchronous message delivery.
 * Tests dispatch incoming messages explicitly to avoid real cross-tab I/O.
 */
function createBroadcast(name: string): BroadcastChannel {
  return Object.assign(new EventTarget(), {
    name,
    onmessage: null,
    onmessageerror: null,
    postMessage: vi.fn<BroadcastChannel['postMessage']>(),
    close: vi.fn<BroadcastChannel['close']>(),
  })
}

/**
 * Tracks roots created by these tests so failed assertions cannot leave
 * provider effects mounted or global channel stubs installed.
 */
const roots: Root[] = []

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount()
  })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('QueryProvider broadcast isolation', () => {
  it('does not create a channel for default or supplied queries', async ({ expect }) => {
    const constructor = vi.fn<() => BroadcastChannel>(function () {
      return createBroadcast('query')
    })
    vi.stubGlobal('BroadcastChannel', constructor)
    const query = createQuery()
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    await act(async () => {
      root.render(
        <>
          <QueryProvider />
          <QueryProvider query={query} />
        </>
      )
    })

    expect(constructor).not.toHaveBeenCalled()
    expect(query.broadcast()).toBeUndefined()
  })

  it('preserves a caller channel and removes only its listener on cleanup', async ({ expect }) => {
    const broadcast = createBroadcast('query:account-a')
    const add = vi.spyOn(broadcast, 'addEventListener')
    const remove = vi.spyOn(broadcast, 'removeEventListener')
    const query = createQuery({ broadcast })
    const listener = vi.fn<() => void>()
    const unsubscribe = query.subscribe('/user', 'hydrated', listener)
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    await act(async () => {
      root.render(<QueryProvider query={query} />)
    })
    expect(query.broadcast()).toBe(broadcast)
    expect(add).toHaveBeenCalledOnce()
    broadcast.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listener).toHaveBeenCalledOnce()

    await act(async () => root.unmount())
    expect(remove).toHaveBeenCalledWith('message', add.mock.calls[0]?.[1])
    expect(broadcast.close).not.toHaveBeenCalled()
    broadcast.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listener).toHaveBeenCalledOnce()
    query.hydrate('/user', { account: 'a' })
    expect(broadcast.postMessage).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('keeps explicitly scoped account channels separate', async ({ expect }) => {
    const broadcastA = createBroadcast('query:account-a')
    const broadcastB = createBroadcast('query:account-b')
    const queryA = createQuery({ broadcast: broadcastA })
    const queryB = createQuery({ broadcast: broadcastB })
    const listenerA = vi.fn<() => void>()
    const listenerB = vi.fn<() => void>()
    const unsubscribeA = queryA.subscribe('/user', 'hydrated', listenerA)
    const unsubscribeB = queryB.subscribe('/user', 'hydrated', listenerB)
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    await act(async () => {
      root.render(
        <>
          <QueryProvider query={queryA} />
          <QueryProvider query={queryB} />
        </>
      )
    })
    queryA.hydrate('/user', { account: 'a' })
    expect(broadcastA.postMessage).toHaveBeenCalledOnce()
    expect(broadcastB.postMessage).not.toHaveBeenCalled()
    listenerA.mockClear()
    broadcastB.dispatchEvent(
      new MessageEvent('message', {
        data: { event: 'hydrated:/user', detail: { account: 'b' } },
      })
    )
    expect(listenerB).toHaveBeenCalledOnce()
    expect(listenerA).not.toHaveBeenCalled()
    expect(queryA.broadcast()).toBe(broadcastA)
    expect(queryB.broadcast()).toBe(broadcastB)
    unsubscribeA()
    unsubscribeB()
  })

  it('shares one subscription until the last provider unmounts, including StrictMode', async ({
    expect,
  }) => {
    const broadcast = createBroadcast('query:account-a')
    const query = createQuery({ broadcast })
    const listener = vi.fn<() => void>()
    const unsubscribe = query.subscribe('/user', 'hydrated', listener)
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    await act(async () => {
      root.render(
        <StrictMode>
          <QueryProvider key="first" query={query} />
          <QueryProvider key="second" query={query} />
        </StrictMode>
      )
    })
    broadcast.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listener).toHaveBeenCalledOnce()

    await act(async () => {
      root.render(
        <StrictMode>
          <QueryProvider key="second" query={query} />
        </StrictMode>
      )
    })
    broadcast.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listener).toHaveBeenCalledTimes(2)
    await act(async () => root.unmount())
    broadcast.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listener).toHaveBeenCalledTimes(2)
    expect(broadcast.close).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('delivers real cross-tab messages only within the opted-in account scope', async ({
    expect,
  }) => {
    const broadcastA = new BroadcastChannel('provider-test:account-a')
    const broadcastB = new BroadcastChannel('provider-test:account-b')
    const peerA = new BroadcastChannel('provider-test:account-a')
    const peerB = new BroadcastChannel('provider-test:account-b')
    const queryA = createQuery({ broadcast: broadcastA })
    const queryB = createQuery({ broadcast: broadcastB })
    const listenerB = vi.fn<() => void>()
    const unsubscribeB = queryB.subscribe('/user', 'hydrated', listenerB)
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    try {
      await act(async () => {
        root.render(
          <>
            <QueryProvider query={queryA} />
            <QueryProvider query={queryB} />
          </>
        )
      })
      const receivedA = queryA.once('/user', 'hydrated')
      const receivedB = new Promise<void>((resolve) => {
        broadcastB.addEventListener('message', () => resolve(), { once: true })
      })
      peerA.postMessage({ event: 'hydrated:/user', detail: { account: 'a' } })
      peerB.postMessage({ event: 'test:barrier' })
      const [event] = await Promise.all([receivedA, receivedB])

      expect(event.detail).toEqual({ account: 'a' })
      expect(listenerB).not.toHaveBeenCalled()
      expect(queryA.broadcast()).toBe(broadcastA)
      expect(queryB.broadcast()).toBe(broadcastB)
    } finally {
      await act(async () => root.unmount())
      unsubscribeB()
      for (const channel of [broadcastA, broadcastB, peerA, peerB]) channel.close()
    }
  })

  it('moves the subscription when the supplied query changes', async ({ expect }) => {
    const broadcastA = createBroadcast('query:account-a')
    const broadcastB = createBroadcast('query:account-b')
    const queryA = createQuery({ broadcast: broadcastA })
    const queryB = createQuery({ broadcast: broadcastB })
    const listenerA = vi.fn<() => void>()
    const listenerB = vi.fn<() => void>()
    const unsubscribeA = queryA.subscribe('/user', 'hydrated', listenerA)
    const unsubscribeB = queryB.subscribe('/user', 'hydrated', listenerB)
    const root = createRoot(document.createElement('div'))
    roots.push(root)

    await act(async () => root.render(<QueryProvider query={queryA} />))
    await act(async () => root.render(<QueryProvider query={queryB} />))
    broadcastA.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    broadcastB.dispatchEvent(new MessageEvent('message', { data: { event: 'hydrated:/user' } }))
    expect(listenerA).not.toHaveBeenCalled()
    expect(listenerB).toHaveBeenCalledOnce()
    expect(broadcastA.close).not.toHaveBeenCalled()
    expect(broadcastB.close).not.toHaveBeenCalled()
    unsubscribeA()
    unsubscribeB()
  })

  it('renders without a global BroadcastChannel, including on the server', async ({ expect }) => {
    vi.stubGlobal('BroadcastChannel', undefined)
    expect(renderToString(<QueryProvider>server</QueryProvider>)).toBe('server')
    const root = createRoot(document.createElement('div'))
    roots.push(root)
    await act(async () => root.render(<QueryProvider />))
  })
})
