/**
 * Unfinished Solid bindings, available through repository source imports only.
 * package.json publishes no @studiolambda/query/solid entry point. The provider
 * exposes reactive query/options accessors; no Solid data hook is implemented.
 *
 * Unlike the core/React defaults, the client provider creates a channel named
 * "query" unless supplied one. It closes only its own channel on cleanup.
 * Shared channel names are not tenant isolation or authorization boundaries.
 * Prefer a caller-owned explicitly scoped channel when using these sources.
 *
 * @example
 * import { QueryProvider } from 'query/solid:components/QueryProvider'
 * const view = <QueryProvider fetcher={async () => 'Ada'}>Application</QueryProvider>
 *
 * @module
 */
// export * from 'query/solid:useQuery'
export * from 'query/solid:context'
export * from 'query/solid:components/QueryProvider'
