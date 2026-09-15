import { describe, expect, it } from 'vitest'

import { toClauseContext } from '@/lib/clause-context'
import type { Clause } from '@/lib/schema'

const clause = (over: Partial<Clause> = {}): Clause => ({
  id: 'c-1',
  heading: 'Security Deposit',
  sourceQuote: 'The Licensee has paid a deposit of Rs. 4,20,000/-.',
  plainLanguage: 'You paid ten months of rent up front.',
  risk: 'high',
  riskReason: 'A large sum whose return the landlord decides alone.',
  obligationOn: 'you',
  ...over,
})

/**
 * This function is the contract between client and server: the browser builds
 * the grounding block for an unsaved analysis, the server rebuilds it from the
 * database for a saved one, and the signature over it only verifies if both
 * produce the same bytes. Its output format is therefore load-bearing.
 */
describe('toClauseContext', () => {
  it('renders id, heading, risk, quote and plain language for one clause', () => {
    expect(toClauseContext([clause()])).toBe(
      [
        '[c-1] Security Deposit (high risk)',
        '"The Licensee has paid a deposit of Rs. 4,20,000/-."',
        'You paid ten months of rent up front.',
      ].join('\n'),
    )
  })

  it('separates clauses with a blank line', () => {
    const rendered = toClauseContext([clause(), clause({ id: 'c-2', heading: 'Lock-in' })])

    expect(rendered).toContain('\n\n[c-2] Lock-in (high risk)')
  })

  it('is deterministic, so the same clauses always sign to the same token', () => {
    const clauses = [clause(), clause({ id: 'c-2' })]

    expect(toClauseContext(clauses)).toBe(toClauseContext(clauses))
  })

  it('returns an empty string for no clauses', () => {
    expect(toClauseContext([])).toBe('')
  })
})
