import { AppError, ERROR_CODES } from '@/lib/errors'

/**
 * Per-instance, in-memory rate limiting for the routes that call the model.
 * These endpoints are public and proxy a metered API, so they cannot be left
 * unbounded.
 *
 * Deliberately not distributed: a serverless instance holds its own window, so
 * the real limit is looser than the configured one. That is the right trade for
 * a single-region pilot — it costs no extra service and still stops the obvious
 * abuse of a public endpoint.
 */

const WINDOW_MS = 60_000

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

export function enforceRateLimit(key: string, limit: number, now = Date.now()): void {
  const existing = windows.get(key)

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS })
    pruneExpired(now)
    return
  }

  if (existing.count >= limit) throw new AppError(ERROR_CODES.RATE_LIMITED, `key=${key}`)

  existing.count += 1
}

/** Identifies the caller for rate limiting. Falls back to a shared bucket. */
export function clientKey(request: Request, route: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `${route}:${ip}`
}

function pruneExpired(now: number): void {
  for (const [key, window] of windows) {
    if (now >= window.resetAt) windows.delete(key)
  }
}

/** Test seam: the window map is module state, so tests need a way to reset it. */
export function resetRateLimits(): void {
  windows.clear()
}
