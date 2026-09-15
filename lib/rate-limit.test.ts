import { beforeEach, describe, expect, it } from 'vitest'

import { AppError } from '@/lib/errors'
import { clientKey, enforceInMemory, resetRateLimits } from '@/lib/rate-limit'

/**
 * The shared counter is one atomic SQL statement, so what is worth testing there
 * is the statement, against a real Postgres — not a mock that would only assert
 * the query string back at itself. These cover the single-process path used in
 * development and when a query fails.
 */
describe('enforceInMemory', () => {
  beforeEach(resetRateLimits)

  it('allows requests up to the limit and rejects the next one', () => {
    const now = 1_000

    expect(() => enforceInMemory('k', 2, now)).not.toThrow()
    expect(() => enforceInMemory('k', 2, now)).not.toThrow()
    expect(() => enforceInMemory('k', 2, now)).toThrow(AppError)
  })

  it('starts a fresh window once the previous one expires', () => {
    enforceInMemory('k', 1, 0)
    expect(() => enforceInMemory('k', 1, 30_000)).toThrow(AppError)
    expect(() => enforceInMemory('k', 1, 60_000)).not.toThrow()
  })

  it('tracks callers independently', () => {
    enforceInMemory('a', 1, 0)
    expect(() => enforceInMemory('b', 1, 0)).not.toThrow()
  })

  it('forgets a caller whose window has long expired', () => {
    enforceInMemory('stale', 1, 0)
    enforceInMemory('fresh', 1, 600_000)

    expect(() => enforceInMemory('stale', 1, 600_000)).not.toThrow()
  })
})

describe('clientKey', () => {
  it('uses the first address in x-forwarded-for', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    })

    expect(clientKey(request, 'analyze')).toBe('analyze:203.0.113.7')
  })

  it('separates the same caller across routes', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.7' },
    })

    expect(clientKey(request, 'ask')).not.toBe(clientKey(request, 'compare'))
  })

  it('falls back to x-real-ip behind a proxy that sets only that', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-real-ip': '198.51.100.4' },
    })

    expect(clientKey(request, 'analyze')).toBe('analyze:198.51.100.4')
  })

  it('prefers x-forwarded-for when both headers are present', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '198.51.100.4' },
    })

    expect(clientKey(request, 'analyze')).toBe('analyze:203.0.113.7')
  })

  it('falls back to a shared bucket when neither header is present', () => {
    expect(clientKey(new Request('https://example.test'), 'ask')).toBe('ask:unidentified')
  })
})
