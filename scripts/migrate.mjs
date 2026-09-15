// Applies the SQL in drizzle/ to the database in DATABASE_URL.
//
// Uses Neon's HTTP driver rather than `drizzle-kit migrate`, which connects
// over a websocket — that connection is blocked on some networks and fails by
// hanging rather than erroring, which is a bad way to find out your migration
// never ran.
import 'dotenv/config'

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. See .env.example.')
  process.exit(1)
}

const db = drizzle(neon(process.env.DATABASE_URL))

await migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations applied.')
