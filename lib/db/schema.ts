import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import type { ObligationParty, RiskLevel } from '@/lib/schema'

/**
 * Persistence exists for three reasons: share links, so an analysis can be
 * opened without re-uploading; a cache, so re-opening a document never calls
 * the model again; and pilot feedback, which this edition of the event asks for.
 *
 * The uploaded PDF is deliberately never stored. We keep the extracted analysis
 * and the clause text needed to ground follow-up questions, nothing more.
 */

export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Unguessable public identifier. Ids are never sequential. */
  shareId: text('share_id').notNull().unique(),
  fileName: text('file_name').notNull(),
  docType: text('doc_type').notNull(),
  summary: text('summary').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().notNull(),
  /** Serialised clauses used to ground follow-up questions. */
  clauseContext: text('clause_context').notNull(),
  /** Which model produced this analysis, so old rows stay interpretable. */
  modelId: text('model_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

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

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  answerable: boolean('answerable').notNull(),
  citedClauseIds: jsonb('cited_clause_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
