import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import { isPersistenceEnabled } from '@/lib/env'
import * as schema from '@/lib/db/schema'

/**
 * Neon's HTTP driver is used deliberately: it issues each query over `fetch`,
 * so serverless invocations never hold a connection open and there is no pool
 * to exhaust.
 *
 * The database is optional. Analysis works without it — only saving and sharing
 * are lost — so callers check `db()` for null rather than crashing the request.
 */

type Database = ReturnType<typeof drizzle<typeof schema>>

let cached: Database | null = null

export function db(): Database | null {
  if (!isPersistenceEnabled()) return null
  cached ??= drizzle(neon(process.env.DATABASE_URL!), { schema })
  return cached
}

export { schema }
