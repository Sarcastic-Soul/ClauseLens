import { sql } from 'drizzle-orm'

import { db } from '@/lib/db'
import { AppError, ERROR_CODES } from '@/lib/errors'

/**
 * Rate limiting for the routes that call the model. These endpoints are public
 * and proxy a metered API, so they cannot be left unbounded.
 *
 * The counter lives in Postgres rather than in memory. Serverless instances
 * share no state, so an in-memory count is enforced per instance and the real
 * ceiling becomes the configured limit multiplied by however many instances are
 * warm — a number the application neither knows nor controls. One row per
 * caller, incremented atomically, gives every instance the same count.
 */

const WINDOW_SECONDS = 60

/**
 * Counts this request and returns how many the caller has made in the current
 * window. The whole read-modify-write is one statement, so two instances
 * arriving together cannot both increment from the same stale value: Postgres
 * serialises them on the row.
 *
 * An expired window is reset in the same statement rather than by a separate
 * cleanup pass, so there is no moment where a stale row lets an extra request
 * through.
 */
async function countRequest(
  database: NonNullable<ReturnType<typeof db>>,
  key: string,
): Promise<number> {
  const result = await database.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, now() + ${`${WINDOW_SECONDS} seconds`}::interval)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.reset_at <= now() THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at <= now()
        THEN now() + ${`${WINDOW_SECONDS} seconds`}::interval
        ELSE rate_limits.reset_at
      END
    RETURNING count
  `)

  return Number(result.rows[0].count)
}

/**
 * Rows are tiny and expire on their own, but nothing would ever delete one for a
 * caller who never returns. Pruning on a small fraction of requests keeps the
 * table bounded without adding a scheduled job.
 */
const PRUNE_PROBABILITY = 0.01

async function pruneExpired(database: NonNullable<ReturnType<typeof db>>): Promise<void> {
  if (Math.random() >= PRUNE_PROBABILITY) return

  try {
    await database.execute(sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 hour'`)
  } catch (error) {
    console.warn('[rate-limit] prune failed', error)
  }
}

/**
 * Throws `RATE_LIMITED` when the caller has used up its allowance.
 *
 * Without a database — local development with no `DATABASE_URL` — there is a
 * single process and an in-memory count is exactly right, so the fallback is
 * not a weaker version of the same thing.
 */
export async function enforceRateLimit(key: string, limit: number): Promise<void> {
  const database = db()

  if (!database) {
    enforceInMemory(key, limit)
    return
  }

  let count: number
  try {
    count = await countRequest(database, key)
  } catch (error) {
    // The limiter must not be the reason a request fails. Fall back to the
    // in-process count, which still bounds a single instance.
    console.error('[rate-limit] database check failed, falling back', error)
    enforceInMemory(key, limit)
    return
  }

  void pruneExpired(database)

  if (count > limit) throw new AppError(ERROR_CODES.RATE_LIMITED, `key=${key} count=${count}`)
}

/** Identifies the caller. Falls back to a shared bucket. */
export function clientKey(request: Request, route: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `${route}:${ip}`
}

/* -------------------------------------------------------------------------- */

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

/** The single-process path: development, and the fallback when a query fails. */
export function enforceInMemory(key: string, limit: number, now = Date.now()): void {
  const existing = windows.get(key)

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 })
    for (const [candidate, window] of windows) {
      if (now >= window.resetAt) windows.delete(candidate)
    }
    return
  }

  if (existing.count >= limit) throw new AppError(ERROR_CODES.RATE_LIMITED, `key=${key}`)

  existing.count += 1
}

/** Test seam: the window map is module state, so tests need a way to reset it. */
export function resetRateLimits(): void {
  windows.clear()
}
