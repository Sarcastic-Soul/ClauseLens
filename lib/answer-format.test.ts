import { describe, expect, it } from 'vitest'

import { extractCitedClauseIds, parseAnswer } from '@/lib/answer-format'
import { NOT_IN_DOCUMENT } from '@/lib/prompts'

describe('parseAnswer', () => {
  it('strips citations from the rendered text but keeps the ids', () => {
    const parsed = parseAnswer('The deposit is ten months of rent [c-3]. It is refundable [c-4].')

    expect(parsed.answerable).toBe(true)
    expect(parsed.text).toBe('The deposit is ten months of rent. It is refundable.')
    expect(parsed.citedClauseIds).toEqual(['c-3', 'c-4'])
  })

  it('reports an unanswerable question without its marker', () => {
    const parsed = parseAnswer(`${NOT_IN_DOCUMENT} The document says nothing about parking.`)

    expect(parsed.answerable).toBe(false)
    expect(parsed.text).toBe('The document says nothing about parking.')
    expect(parsed.citedClauseIds).toEqual([])
  })

  it('tolerates leading whitespace before the refusal marker', () => {
    expect(parseAnswer(`\n\n${NOT_IN_DOCUMENT} Nothing on pets.`).answerable).toBe(false)
  })

  it('does not duplicate a clause cited more than once', () => {
    expect(parseAnswer('Both [c-2] and also [c-2] again.').citedClauseIds).toEqual(['c-2'])
  })

  it('preserves first-appearance order of citations', () => {
    expect(extractCitedClauseIds('[c-9] then [c-1] then [c-9]')).toEqual(['c-9', 'c-1'])
  })

  /**
   * The client re-parses on every streamed chunk, so every prefix of a complete
   * answer has to parse without throwing and without inventing a citation from a
   * bracket that has not closed yet.
   */
  describe('partial input, as it arrives', () => {
    const complete = 'The lock-in is six months [c-4]. Leaving early costs the balance [c-4].'

    it('parses every prefix without throwing', () => {
      for (let length = 0; length <= complete.length; length += 1) {
        expect(() => parseAnswer(complete.slice(0, length))).not.toThrow()
      }
    })

    it('ignores a citation whose bracket has not closed', () => {
      expect(parseAnswer('The lock-in is six months [c-').citedClauseIds).toEqual([])
      expect(parseAnswer('The lock-in is six months [c-4').citedClauseIds).toEqual([])
      expect(parseAnswer('The lock-in is six months [c-4]').citedClauseIds).toEqual(['c-4'])
    })

    it('reaches the same result from the last chunk as from the whole string', () => {
      expect(parseAnswer(complete)).toEqual(parseAnswer(complete.slice(0, complete.length)))
    })

    /**
     * A refusal is only recognisable once the whole marker has arrived. Until
     * then the prefix is treated as an ordinary answer, which is why the UI
     * renders the streaming block and the settled one from the same parser
     * rather than deciding anything on the first chunk.
     */
    it('recognises the refusal marker only once it is complete', () => {
      expect(parseAnswer('NOT_IN_DOC').answerable).toBe(true)
      expect(parseAnswer(NOT_IN_DOCUMENT).answerable).toBe(false)
    })
  })
})
