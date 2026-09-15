import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { ObligationParty, RiskLevel } from '@/lib/schema'

/**
 * Persistence exists for three reasons: share links, so an analysis can be
 * opened without re-uploading; a cache keyed on the document's content hash, so
 * the same file is never analysed twice; and pilot feedback, which this edition
 * of the event asks for.
 *
 * Questions and answers are deliberately not stored. A share link is readable
 * by anyone who has it, so recording what one visitor asked would expose it to
 * the next — a privacy surface in exchange for a feature nobody asked for.
 *
 * The uploaded PDF is deliberately never stored. We keep the extracted analysis
 * and the clause text needed to ground follow-up questions, nothing more.
 */

export const analyses = pgTable(
  'analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Unguessable public identifier. Ids are never sequential. */
    shareId: text('share_id').notNull().unique(),
    /**
     * SHA-256 of the uploaded bytes. Uploading a document that has already been
     * analysed returns the stored analysis instead of calling the model again,
     * which is the whole point of keeping this table. Nullable because rows
     * written before the cache existed have no hash to record.
     */
    contentHash: text('content_hash'),
    fileName: text('file_name').notNull(),
    docType: text('doc_type').notNull(),
    summary: text('summary').notNull(),
    keyPoints: jsonb('key_points').$type<string[]>().notNull(),
    /**
     * Clauses pre-serialised into the grounding block for follow-up questions.
     * Denormalised on purpose: answering a question about a shared analysis then
     * costs one query instead of loading and re-serialising every clause row.
     */
    clauseContext: text('clause_context').notNull(),
    /** Which model produced this analysis, so old rows stay interpretable. */
    modelId: text('model_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('analyses_content_hash_idx').on(table.contentHash)],
)

export const clauses = pgTable('clauses', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  /** Position in the document; also what `c-1`, `c-2` in citations refer to. */
  ordinal: integer('ordinal').notNull(),
  heading: text('heading').notNull(),
  sourceQuote: text('source_quote').notNull(),
  plainLanguage: text('plain_language').notNull(),
  risk: text('risk').$type<RiskLevel>().notNull(),
  riskReason: text('risk_reason').notNull(),
  obligationOn: text('obligation_on').$type<ObligationParty>().notNull(),
})

/**
 * One row per caller per route, holding the current window. Rate limiting lives
 * in the database because serverless instances share nothing in memory: a limit
 * counted per instance is really a limit multiplied by however many instances
 * happen to be warm, which is not a number this application controls.
 *
 * A single atomic upsert does the counting, so two instances incrementing the
 * same row at the same moment cannot both read a stale count.
 */
export const rateLimits = pgTable('rate_limits', {
  /** Route and caller, e.g. `analyze:203.0.113.7`. */
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  /** When the current window ends and the count starts again. */
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
})

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
