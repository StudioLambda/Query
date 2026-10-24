/**
 * React 19 bindings for a core query instance and shared render resources.
 * Supply a stable QueryProvider instance, Suspense for blocking reads, and
 * an error boundary for rejected initial requests. Hook options override
 * context defaults; useQuery combines data, actions, and status hints.
 *
 * Fresh reads share an instance-owned selection across suspended retries and
 * mounted siblings. Effects retain committed consumers and release on cleanup.
 * Prefetch and incoming broadcast subscriptions are client-effect work only.
 * Refetch defaults stale to false, but needs fresh: true to bypass valid cache.
 * Source hook .ts files are not transformed by the TSX-only React Compiler.
 * Examples use this entry point plus core exports and React's named APIs.
 *
 * @example
 * import { Suspense } from 'react'
 * import { createQuery } from '@studiolambda/query'
 * import { QueryProvider, useQuery } from '@studiolambda/query/react'
 * const query = createQuery({ fetcher: async () => 'Ada' })
 * function Profile() { return <span>{useQuery<string>('profile').data}</span> }
 * const view = <QueryProvider query={query}>
 *   <Suspense fallback="Loading"><Profile /></Suspense>
 * </QueryProvider>
 *
 * @module
 */
export * from 'query/react:hooks/useQuery'
export * from 'query/react:hooks/useQueryBasic'
export * from 'query/react:hooks/useQueryStatus'
export * from 'query/react:hooks/useQueryInstance'
export * from 'query/react:hooks/useQueryContext'
export * from 'query/react:hooks/useQueryTransitionContext'
export * from 'query/react:hooks/useQueryActions'
export * from 'query/react:hooks/useQueryPrefetch'
export * from 'query/react:context'
export * from 'query/react:transition'
export * from 'query/react:components/QueryProvider'
export * from 'query/react:components/QueryTransition'
export * from 'query/react:components/QueryPrefetch'
export * from 'query/react:components/QueryPrefetchTags'
