import { describe, expect, it } from 'vitest'

import { AppError } from '@/lib/errors'
import { assertSameOrigin } from '@/lib/origin-guard'

function request(headers: Record<string, string>): Request {
  return new Request('https://example.test/api/analyze', { method: 'POST', headers })
}

describe('assertSameOrigin', () => {
  it('rejects a cross-site request', () => {
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'cross-site' }))).toThrow(AppError)
  })

  it('allows same-origin and same-site requests', () => {
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'same-origin' }))).not.toThrow()
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'same-site' }))).not.toThrow()
  })

  it('allows a typed URL or bookmark, which browsers mark "none"', () => {
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'none' }))).not.toThrow()
  })

  it('falls back to comparing Origin and Host when Sec-Fetch-Site is absent', () => {
    expect(() =>
      assertSameOrigin(request({ origin: 'https://evil.test', host: 'example.test' })),
    ).toThrow(AppError)

    expect(() =>
      assertSameOrigin(request({ origin: 'https://example.test', host: 'example.test' })),
    ).not.toThrow()
  })

  it('lets a request with neither header through', () => {
    expect(() => assertSameOrigin(request({}))).not.toThrow()
  })
})
