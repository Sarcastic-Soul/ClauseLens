import { beforeEach, describe, expect, it } from 'vitest'

import { AppError } from '@/lib/errors'
import { clientKey, enforceRateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('enforceRateLimit', () => {
  beforeEach(resetRateLimits)

  it('allows requests up to the limit and rejects the next one', () => {
    const now = 1_000

    expect(() => enforceRateLimit('k', 2, now)).not.toThrow()
    expect(() => enforceRateLimit('k', 2, now)).not.toThrow()
    expect(() => enforceRateLimit('k', 2, now)).toThrow(AppError)
  })

  it('starts a fresh window once the previous one expires', () => {
    enforceRateLimit('k', 1, 0)
    expect(() => enforceRateLimit('k', 1, 30_000)).toThrow(AppError)
    expect(() => enforceRateLimit('k', 1, 60_000)).not.toThrow()
  })

  it('tracks callers independently', () => {
    enforceRateLimit('a', 1, 0)
    expect(() => enforceRateLimit('b', 1, 0)).not.toThrow()
  })
})

describe('clientKey', () => {
  it('uses the first address in x-forwarded-for', () => {
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    })

    expect(clientKey(request, 'analyze')).toBe('analyze:203.0.113.7')
  })

  it('falls back to a shared bucket when the header is absent', () => {
    expect(clientKey(new Request('https://example.test'), 'ask')).toBe('ask:unknown')
  })
})
