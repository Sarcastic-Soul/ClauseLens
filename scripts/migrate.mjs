// Applies the SQL in drizzle/ to the database in DATABASE_URL.
//
// Uses Neon's HTTP driver rather than `drizzle-kit migrate`, which connects
// over a websocket — that connection is blocked on some networks and fails by
// hanging rather than erroring, which is a bad way to find out your migration
// never ran.
import 'dotenv/config'

import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

// Neon resolves to both IPv4 and IPv6. On a network with no working IPv6 route
// Node's Happy Eyeballs still races the IPv6 address and the connection times
// out as a bare "fetch failed", which reads like a credentials problem and is
// not. Preferring IPv4 and disabling the race removes that dead end.
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. See .env.example.')
  process.exit(1)
}

const db = drizzle(neon(process.env.DATABASE_URL))

await migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations applied.')
