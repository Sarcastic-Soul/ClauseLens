import { describe, expect, it } from 'vitest'

import { AppError } from '@/lib/errors'
import {
  MAX_UPLOAD_BYTES,
  assertAcceptableBodySize,
  assertAcceptableSize,
  assertIsPdf,
  looksLikePdf,
} from '@/lib/upload'

const pdfBytes = (...rest: number[]) => new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, ...rest])

describe('upload rules', () => {
  it('rejects an empty file', () => {
    expect(() => assertAcceptableSize(0)).toThrow(AppError)
  })

  it('rejects a file over the cap but accepts one at the cap', () => {
    expect(() => assertAcceptableSize(MAX_UPLOAD_BYTES + 1)).toThrow(AppError)
    expect(() => assertAcceptableSize(MAX_UPLOAD_BYTES)).not.toThrow()
  })

  it('accepts bytes that start with the PDF magic number', () => {
    expect(looksLikePdf(pdfBytes(0x31, 0x2e, 0x37))).toBe(true)
    expect(() => assertIsPdf(pdfBytes())).not.toThrow()
  })

  it('rejects a renamed file whose bytes are not a PDF', () => {
    expect(looksLikePdf(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false)
    expect(() => assertIsPdf(new Uint8Array([0x50, 0x4b]))).toThrow(AppError)
  })
})

describe('body size guard', () => {
  const requestOf = (headers: Record<string, string>) =>
    new Request('https://example.test/api/analyze', { method: 'POST', headers })

  it('rejects a body whose declared length is well over the cap', () => {
    const declared = String(MAX_UPLOAD_BYTES * 2)
    expect(() => assertAcceptableBodySize(requestOf({ 'content-length': declared }))).toThrow(
      AppError,
    )
  })

  it('accepts a body at the cap, allowing for multipart overhead', () => {
    const declared = String(MAX_UPLOAD_BYTES)
    expect(() => assertAcceptableBodySize(requestOf({ 'content-length': declared }))).not.toThrow()
  })

  it('leaves a body with no declared length to the per-file check', () => {
    expect(() => assertAcceptableBodySize(requestOf({}))).not.toThrow()
  })
})
