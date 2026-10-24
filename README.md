# Lambda Query

> Lightweight asynchronous data management

Lambda Query is a library created to manage asynchronous data on your code. This is generally used when you have to fetch data asynchronously for a given resource. Lambda Query allows you to manage this data by using an internal cache. It is very similar to how vercel's swr work. Lambda Query is also build to support arbitrary cache and event system, making it possible to create your own implementations.

## Documentation

Find out about the project and discover the features at the [Documentation](https://docs.lambda-studio.com/query/getting-started/)

## Installation

```
npm i @studiolambda/query
```

## Migration: cross-tab synchronization is now opt-in

**Breaking change:** React `QueryProvider` no longer creates or joins the
origin-wide `query` BroadcastChannel. By default, data stays in the local query
instance. This prevents unrequested sharing between separate accounts or tenants
on the same origin. Providers no longer replace or close caller-owned channels.

If cross-tab sharing is intentional, use the existing `broadcast` option with a
name scoped to the tenant, account, and session that may share data:

```tsx
import { createQuery } from '@studiolambda/query'
import { QueryProvider } from '@studiolambda/query/react'
import { createRoot } from 'react-dom/client'

// Run in the browser after establishing the authenticated sharing scope.
const channel =
  typeof BroadcastChannel === 'undefined'
    ? undefined
    : new BroadcastChannel('query:tenant-a:account-42:session-7')
const query = createQuery({ broadcast: channel })
const root = createRoot(document.getElementById('root')!)
root.render(<QueryProvider query={query}>Your application</QueryProvider>)

// On logout/session teardown, after all users of this query are done:
root.unmount()
channel?.close()
```

All participating tabs must explicitly use the same sharing scope; different
scopes must use different channels and query instances. Create a fresh query and
channel when switching accounts, tenants, or sessions. Do not create channels
during server rendering. The caller owns channel lifetime; providers only manage
incoming listeners, including when multiple providers share one query.

Broadcasts contain full event payloads, including data in forgotten events, not
just invalidation notices. Channel names are routing labels, not secrets or an
authorization boundary: other code on the same origin can join the same channel.
Do not opt in when that sharing is inappropriate. Older application tabs still
use their previous behavior until reloaded; deploy and reload participating tabs
when migrating away from the global channel.
