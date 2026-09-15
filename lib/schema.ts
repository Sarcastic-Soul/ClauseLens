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

export const answerSchema = z.object({
  answerable: z
    .boolean()
    .describe('False when the document does not contain enough information to answer.'),
  answer: z.string().min(1).describe('The answer, grounded only in the document.'),
  citedClauseIds: z.array(z.string()).describe('Ids of the clauses the answer relies on.'),
})

export type Answer = z.infer<typeof answerSchema>

export const checklistRequestSchema = z.object({
  docType: z.string().trim().min(1).max(200),
  clauseContext: z.string().trim().min(1).max(200_000),
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

export const feedbackRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
})

export const shareIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{12,32}$/, 'Malformed share id')

/**
 * A question carries its own clause context when the analysis was never saved,
 * or a share id when it was. Exactly one is required, so an unsaved analysis
 * still supports follow-up questions.
 */
export const askRequestSchema = z
  .object({
    question: z.string().trim().min(3).max(500),
    clauseContext: z.string().max(200_000).optional(),
    shareId: shareIdSchema.optional(),
  })
  .refine((body) => Boolean(body.clauseContext ?? body.shareId), {
    message: 'Either clauseContext or shareId is required',
  })

/**
 * Gemini accepts standard JSON Schema, but rejects the `$schema` annotation
 * that Zod emits. Strip it here so no call site has to remember.
 */
export function toModelSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>
  delete jsonSchema.$schema
  return jsonSchema
}
