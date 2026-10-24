/**
 * Framework-independent promise cache with keyed events and explicit writes.
 * createQuery owns request selection, expiration, cancellation signals, and
 * per-key mutation ordering. Supplied objects are retained, not cloned.
 * Fetched values live for 2000 ms by default; local writes expire immediately.
 * Channels are opt-in and caller-owned. Channel names are not authorization.
 *
 * Examples in this directory use named exports from this package entry point.
 * Fetch failures reject caller promises; stale background failures emit error.
 * For framework render lifetimes use Query.resource rather than repeatedly
 * forcing fresh imperative queries.
 *
 * @example
 * import { createQuery } from '@studiolambda/query'
 * const query = createQuery({ fetcher: async () => ({ name: 'Ada' }) })
 * try { console.log(await query.query('profile')) }
 * catch (error) { console.error(error) }
 *
 * @module
 */
export * from './query'
export * from './cache'
export * from './options'
