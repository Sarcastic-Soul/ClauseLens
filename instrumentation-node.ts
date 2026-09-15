import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'

/**
 * Neon's hostnames resolve to both IPv4 and IPv6. On a local network without a
 * working IPv6 route, Node still races the IPv6 address and the connection
 * times out as a bare "fetch failed", which looks like a credentials problem
 * and is not. Preferring IPv4 and disabling the race removes that dead end.
 *
 * Imported for its side effect, and only from the Node.js runtime — see
 * `instrumentation.ts`.
 */
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)
