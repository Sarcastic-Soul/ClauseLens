import { setDefaultResultOrder } from 'node:dns'

/**
 * Runs once when the server starts.
 *
 * Neon's hostnames resolve to both IPv6 and IPv4. On a local network without a
 * working IPv6 route the first connection attempt fails with a bare
 * "fetch failed", which looks like a credentials problem and is not. Preferring
 * IPv4 in development removes that dead end. Production is left on the Node
 * default, where IPv6 works.
 */
export async function register(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    setDefaultResultOrder('ipv4first')
  }
}
