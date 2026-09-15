import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'

/**
 * Runs once when the server starts.
 *
 * Neon's hostnames resolve to both IPv4 and IPv6. On a local network without a
 * working IPv6 route, Node still races the IPv6 address and the connection
 * times out as a bare "fetch failed", which looks like a credentials problem
 * and is not. Preferring IPv4 and disabling the race removes that dead end in
 * development. Production is left on the Node defaults, where IPv6 works.
 */
export async function register(): Promise<void> {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_RUNTIME === 'nodejs') {
    setDefaultResultOrder('ipv4first')
    setDefaultAutoSelectFamily(false)
  }
}
