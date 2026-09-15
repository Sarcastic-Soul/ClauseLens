import { z } from 'zod'

/**
 * The domain vocabulary of the problem statement, in one place. These schemas
 * are the single source of truth: they validate API input, they derive the JSON
 * schema the model must fill, and they export the TypeScript types the UI uses.
 */

export const RISK_LEVELS = ['low', 'medium', 'high'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const OBLIGATION_PARTIES = ['you', 'counterparty', 'both', 'none'] as const
export type ObligationParty = (typeof OBLIGATION_PARTIES)[number]

/** Returned when the document is not a legal agreement we can break into clauses. */
export const UNRECOGNISED_DOC_TYPE = 'unrecognised'

/**
 * One clause as the model returns it. Ids are assigned by us after extraction
 * (see `withClauseIds`) so the model never invents identifiers that later have
 * to be reconciled with citations.
 */
export const extractedClauseSchema = z.object({
  heading: z.string().min(1).describe('Short heading for the clause, e.g. "Termination".'),
  sourceQuote: z
    .string()
    .min(1)
    .describe('Verbatim text copied from the document. Never paraphrased.'),
  plainLanguage: z.string().min(1).describe('What the clause means, in everyday language.'),
  risk: z.enum(RISK_LEVELS).describe('How much this clause could cost the reader.'),
  riskReason: z.string().min(1).describe('One sentence explaining the risk level.'),
  obligationOn: z.enum(OBLIGATION_PARTIES).describe('Which party the clause binds.'),
})

export const extractedAnalysisSchema = z.object({
  docType: z
    .string()
    .min(1)
    .describe(`Type of document, e.g. "Residential rental agreement". "${UNRECOGNISED_DOC_TYPE}" if it is not a legal agreement.`),
  summary: z.string().min(1).describe('Two or three sentences on what this document does.'),
  keyPoints: z
    .array(z.string().min(1))
    .max(5)
    .describe('Up to five things the reader should know before signing.'),
  clauses: z.array(extractedClauseSchema),
})

export type ExtractedClause = z.infer<typeof extractedClauseSchema>
export type ExtractedAnalysis = z.infer<typeof extractedAnalysisSchema>

export type Clause = ExtractedClause & { id: string }
export type Analysis = Omit<ExtractedAnalysis, 'clauses'> & { clauses: Clause[] }

/** Stable, readable clause ids: `c-1`, `c-2`, ... Used by Q&A citations. */
export function withClauseIds(analysis: ExtractedAnalysis): Analysis {
  return {
    ...analysis,
    clauses: analysis.clauses.map((clause, index) => ({ ...clause, id: `c-${index + 1}` })),
  }
}

export const shareIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{12,32}$/, 'Malformed share id')

/** An HMAC of the clause context, issued by `/api/analyze`. Base64url, so short. */
export const contextTokenSchema = z.string().min(16).max(200)

/**
 * Grounding context reaches `/api/ask` and `/api/checklist` one of two ways: a
 * share id, which the server resolves against the database, or the context
 * itself plus the token that proves this server produced it. Requests carrying
 * unsigned context are refused — see `lib/context-token.ts`.
 */
const groundedRequest = {
  clauseContext: z.string().trim().max(200_000).optional(),
  contextToken: contextTokenSchema.optional(),
  shareId: shareIdSchema.optional(),
}

function isGrounded(body: {
  clauseContext?: string
  contextToken?: string
  shareId?: string
}): boolean {
  return Boolean(body.shareId ?? (body.clauseContext && body.contextToken))
}

const GROUNDING_REQUIRED = 'Provide either a shareId, or clauseContext with its contextToken'

export const checklistRequestSchema = z
  .object({
    docType: z.string().trim().min(1).max(200).optional(),
    ...groundedRequest,
  })
  .refine((body) => Boolean(body.shareId) || Boolean(isGrounded(body) && body.docType), {
    message: `${GROUNDING_REQUIRED}, and a docType alongside clauseContext`,
  })

export const checklistSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.string().min(1).describe('A question to put to a legal professional.'),
        why: z.string().min(1).describe('Why this is worth asking, in one sentence.'),
        relatedClauseIds: z.array(z.string()),
      }),
    )
    .max(8),
})

export type Checklist = z.infer<typeof checklistSchema>

/** Which document a difference is better for, from the reader's side. */
export const FAVOURS = ['first', 'second', 'neither'] as const
export type Favours = (typeof FAVOURS)[number]

/**
 * Comparison output. Differences only: listing what two contracts have in
 * common would bury the answer the reader came for, which is what changed and
 * whether the change is in their favour.
 */
export const comparisonSchema = z.object({
  docTypeFirst: z.string().min(1).describe('Type of the first document.'),
  docTypeSecond: z.string().min(1).describe('Type of the second document.'),
  comparable: z
    .boolean()
    .describe('False when the two documents are too unalike to compare meaningfully.'),
  summary: z.string().min(1).describe('Two or three sentences on how the two documents differ.'),
  differences: z
    .array(
      z.object({
        topic: z.string().min(1).describe('What the difference is about, e.g. "Notice period".'),
        inFirst: z.string().min(1).describe('What the first document says. "Not addressed" if absent.'),
        inSecond: z.string().min(1).describe('What the second document says. "Not addressed" if absent.'),
        favours: z
          .enum(FAVOURS)
          .describe('Which document is better for the reader on this point.'),
        why: z.string().min(1).describe('One sentence on what the difference costs or saves.'),
      }),
    )
    .max(12),
})

export type Comparison = z.infer<typeof comparisonSchema>

export const feedbackRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

/**
 * A question carries a share id when the analysis was saved, or the clause
 * context and its token when it was not, so an unsaved analysis still supports
 * follow-up questions without opening the endpoint to arbitrary text.
 */
export const askRequestSchema = z
  .object({
    question: z.string().trim().min(3).max(500),
    ...groundedRequest,
  })
  .refine(isGrounded, { message: GROUNDING_REQUIRED })

/**
 * Gemini accepts standard JSON Schema, but rejects the `$schema` annotation
 * that Zod emits. Strip it here so no call site has to remember.
 */
export function toModelSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>
  delete jsonSchema.$schema
  return jsonSchema
}
