import { describe, expect, it } from 'vitest'

import { extractCitedClauseIds, parseAnswer } from '@/lib/answer-format'
import { NOT_IN_DOCUMENT } from '@/lib/prompts'

describe('parseAnswer', () => {
  it('extracts cited clauses and removes the markers from the text', () => {
    const parsed = parseAnswer('The deposit is refundable within 30 days [c-4].')

    expect(parsed.answerable).toBe(true)
    expect(parsed.text).toBe('The deposit is refundable within 30 days.')
    expect(parsed.citedClauseIds).toEqual(['c-4'])
  })

  it('keeps citation order and drops duplicates', () => {
    expect(extractCitedClauseIds('a [c-9] b [c-2] c [c-9]')).toEqual(['c-9', 'c-2'])
  })

  it('marks an answer unanswerable when the document does not cover it', () => {
    const parsed = parseAnswer(`${NOT_IN_DOCUMENT} The agreement says nothing about parking.`)

    expect(parsed.answerable).toBe(false)
    expect(parsed.text).toBe('The agreement says nothing about parking.')
    expect(parsed.citedClauseIds).toEqual([])
  })

  it('handles partial text mid-stream without throwing', () => {
    expect(parseAnswer('The landlord may ent').text).toBe('The landlord may ent')
  })
})
