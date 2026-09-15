import { describe, expect, it, vi } from 'vitest'

import { isTransient } from '@/lib/analysis-store'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { withModelFailover } from '@/lib/gemini'

describe('withModelFailover', () => {
  it('returns the first model that succeeds without calling the rest', async () => {
    const attempt = vi.fn().mockResolvedValue('ok')

    await expect(withModelFailover('first,second', attempt)).resolves.toBe('ok')
    expect(attempt).toHaveBeenCalledTimes(1)
    expect(attempt).toHaveBeenCalledWith('first')
  })

  it('falls through to the next model when one is unavailable', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new AppError(ERROR_CODES.MODEL_UNAVAILABLE))
      .mockResolvedValueOnce('second answered')

    await expect(withModelFailover('first,second', attempt)).resolves.toBe('second answered')
    expect(attempt).toHaveBeenNthCalledWith(2, 'second')
  })

  it('falls through on a rate limit too', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new AppError(ERROR_CODES.MODEL_RATE_LIMITED))
      .mockResolvedValueOnce('ok')

    await expect(withModelFailover('a,b', attempt)).resolves.toBe('ok')
  })

  /** A malformed request fails identically on every model, so retrying wastes quota. */
  it('does not fall through on an error a different model would repeat', async () => {
    const attempt = vi.fn().mockRejectedValue(new AppError(ERROR_CODES.MODEL_BAD_OUTPUT))

    await expect(withModelFailover('first,second', attempt)).rejects.toBeInstanceOf(AppError)
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('surfaces the last error when every model is unavailable', async () => {
    const attempt = vi.fn().mockRejectedValue(new AppError(ERROR_CODES.MODEL_UNAVAILABLE, 'last'))

    await expect(withModelFailover('a,b,c', attempt)).rejects.toThrow('last')
    expect(attempt).toHaveBeenCalledTimes(3)
  })
})

describe('isTransient', () => {
  it.each([
    'fetch failed',
    'connect ECONNRESET 10.0.0.1:5432',
    'Connection terminated unexpectedly',
    'socket hang up',
    'query timeout exceeded',
  ])('retries a connection that never came up: %s', (message) => {
    expect(isTransient(new Error(message))).toBe(true)
  })

  it.each([
    'duplicate key value violates unique constraint "analyses_share_id_unique"',
    'column "nope" does not exist',
    'invalid input syntax for type uuid',
  ])('does not retry a query the database rejected: %s', (message) => {
    expect(isTransient(new Error(message))).toBe(false)
  })

  it('handles a thrown non-Error', () => {
    expect(isTransient('fetch failed')).toBe(true)
    expect(isTransient(null)).toBe(false)
  })
})
