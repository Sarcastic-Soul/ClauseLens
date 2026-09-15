import { loadAnalysis, loadClauseContext } from '@/lib/analysis-store'
import { toClauseContext } from '@/lib/clause-context'
import { verifyContext } from '@/lib/context-token'
import { AppError, ERROR_CODES } from '@/lib/errors'

/**
 * Resolves the clauses a grounded call answers over, from whichever of the two
 * routes the request used.
 *
 * A saved analysis is read from the database, so nothing the caller sends is
 * trusted. An unsaved one travels in the request, and is accepted only with a
 * valid signature — `lib/context-token.ts` explains why.
 */

export type GroundingRequest = {
  clauseContext?: string
  contextToken?: string
  shareId?: string
}

function assertSigned({ clauseContext, contextToken }: GroundingRequest): string {
  if (!clauseContext) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, 'Neither shareId nor clauseContext was supplied')
  }

  if (!verifyContext(clauseContext, contextToken)) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, 'Clause context failed signature verification')
  }

  return clauseContext
}

/**
 * Just the grounding text. Reads one column for a saved analysis rather than
 * every clause row, because answering a question needs nothing else.
 */
export async function resolveClauseContext(request: GroundingRequest): Promise<string> {
  if (request.shareId) {
    const stored = await loadClauseContext(request.shareId)
    if (!stored) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `No analysis for share id ${request.shareId}`)
    }
    return stored
  }

  return assertSigned(request)
}

/**
 * Grounding text and the document type, which the checklist prompt needs. Costs
 * the full read for a saved analysis, which is the price of not trusting a
 * caller-supplied document type.
 */
export async function resolveGrounding(
  request: GroundingRequest & { docType?: string },
): Promise<{ clauseContext: string; docType: string }> {
  if (request.shareId) {
    const stored = await loadAnalysis(request.shareId)
    if (!stored) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `No analysis for share id ${request.shareId}`)
    }
    return { clauseContext: toClauseContext(stored.clauses), docType: stored.docType }
  }

  const clauseContext = assertSigned(request)
  if (!request.docType) {
    throw new AppError(ERROR_CODES.INVALID_INPUT, 'docType is required alongside clauseContext')
  }

  return { clauseContext, docType: request.docType }
}
