import { describe, expect, it } from 'vitest'

import { parseModelChain } from '@/lib/gemini'

describe('parseModelChain', () => {
  it('reads a single model', () => {
    expect(parseModelChain('gemini-3.5-flash')).toEqual(['gemini-3.5-flash'])
  })

  it('reads a comma separated chain and trims whitespace', () => {
    expect(parseModelChain('gemini-3.8-flash, gemini-3.5-flash ')).toEqual([
      'gemini-3.8-flash',
      'gemini-3.5-flash',
    ])
  })

  it('ignores empty entries', () => {
    expect(parseModelChain('a,,b,')).toEqual(['a', 'b'])
  })

  it('rejects a spec with no models', () => {
    expect(() => parseModelChain(' , ')).toThrow()
  })
})
