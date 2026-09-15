import { AppError, ERROR_CODES } from '@/lib/errors'

/**
 * Blocks a cross-site POST to a metered route. Without this, any page on the
 * internet can point a visitor's browser at these endpoints and spend this
 * deployment's Gemini quota — the request carries the visitor's cookies and
 * origin, but none of that is checked before the model is called.
 *
 * `Sec-Fetch-Site` is sent by every current browser and needs no origin list to
 * maintain: `cross-site` is rejected, everything else (`same-origin`,
 * `same-site`, or `none` for a typed URL or bookmark) is allowed.
 *
 * A browser old enough to omit the header (pre-2023) falls back to comparing
 * `Origin` against `Host`. A request with neither header — curl, a server, any
 * non-browser client — has nothing to compare and is let through unguarded, the
 * same as before this check existed; the rate limiter still bounds it.
 */
export function assertSameOrigin(request: Request): void {
  const site = request.headers.get('sec-fetch-site')
  if (site) {
    if (site === 'cross-site') {
      throw new AppError(ERROR_CODES.FORBIDDEN, `sec-fetch-site=${site}`)
    }
    return
  }

  const origin = request.headers.get('origin')
  if (!origin) return

  const host = request.headers.get('host')
  if (host && new URL(origin).host !== host) {
    throw new AppError(ERROR_CODES.FORBIDDEN, `origin=${origin} host=${host}`)
  }
}
