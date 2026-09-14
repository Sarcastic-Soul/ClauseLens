import { describe, expect, it } from 'vitest'

import { extractedAnalysisSchema, toModelSchema, withClauseIds } from '@/lib/schema'

const clause = {
  heading: 'Termination',
  sourceQuote: 'Either party may terminate on 30 days notice.',
  plainLanguage: 'Both sides can end the agreement with a month of warning.',
  risk: 'medium' as const,
  riskReason: 'Leaves you a month to find a replacement.',
  obligationOn: 'both' as const,
}

describe('analysis schema', () => {
  it('accepts a well-formed analysis', () => {
    const parsed = extractedAnalysisSchema.safeParse({
      docType: 'Residential rental agreement',
      summary: 'A twelve month tenancy.',
      keyPoints: ['Deposit is two months rent.'],
      clauses: [clause],
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects an unknown risk level', () => {
    const parsed = extractedAnalysisSchema.safeParse({
      docType: 'NDA',
      summary: 'Mutual confidentiality.',
      keyPoints: [],
      clauses: [{ ...clause, risk: 'catastrophic' }],
    })

    expect(parsed.success).toBe(false)
  })

  it('assigns sequential clause ids', () => {
    const analysis = withClauseIds({
      docType: 'NDA',
      summary: 'Mutual confidentiality.',
      keyPoints: [],
      clauses: [clause, clause],
    })

    expect(analysis.clauses.map((c) => c.id)).toEqual(['c-1', 'c-2'])
  })

  it('emits a model schema without the $schema annotation Gemini rejects', () => {
    const modelSchema = toModelSchema(extractedAnalysisSchema)

    expect(modelSchema.$schema).toBeUndefined()
    expect(modelSchema.type).toBe('object')
  })
})
