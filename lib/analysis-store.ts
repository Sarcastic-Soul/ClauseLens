import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { db, schema } from '@/lib/db'
import type { Analysis, Clause } from '@/lib/schema'

/**
 * Saving and loading analyses. Every function here tolerates the database being
 * absent or unreachable: a failed save costs the share link, not the analysis
 * the user is already looking at.
 */

const SHARE_ID_LENGTH = 16

export type StoredAnalysis = Analysis & { shareId: string; fileName: string }

export function newShareId(): string {
  return nanoid(SHARE_ID_LENGTH)
}

/** Serialises clauses into the grounding context sent with follow-up questions. */
export function toClauseContext(clauses: Clause[]): string {
  return clauses
    .map((clause) => `[${clause.id}] ${clause.heading}\n"${clause.sourceQuote}"\n${clause.plainLanguage}`)
    .join('\n\n')
}

/**
 * Persists an analysis and returns its share id, or null when persistence is
 * unavailable. Never throws: the caller has a result worth showing either way.
 */
export async function saveAnalysis(input: {
  analysis: Analysis
  fileName: string
  modelId: string
}): Promise<string | null> {
  const database = db()
  if (!database) return null

  const shareId = newShareId()

  try {
    const [row] = await database
      .insert(schema.analyses)
      .values({
        shareId,
        fileName: input.fileName,
        docType: input.analysis.docType,
        summary: input.analysis.summary,
        keyPoints: input.analysis.keyPoints,
        clauseContext: toClauseContext(input.analysis.clauses),
        modelId: input.modelId,
      })
      .returning({ id: schema.analyses.id })

    if (input.analysis.clauses.length > 0) {
      await database.insert(schema.clauses).values(
        input.analysis.clauses.map((clause, index) => ({
          analysisId: row.id,
          ordinal: index + 1,
          heading: clause.heading,
          sourceQuote: clause.sourceQuote,
          plainLanguage: clause.plainLanguage,
          risk: clause.risk,
          riskReason: clause.riskReason,
          obligationOn: clause.obligationOn,
        })),
      )
    }

    return shareId
  } catch (error) {
    console.error('[saveAnalysis]', error)
    return null
  }
}

/** Loads a shared analysis, or null when it does not exist or cannot be read. */
export async function loadAnalysis(shareId: string): Promise<StoredAnalysis | null> {
  const database = db()
  if (!database) return null

  const [analysis] = await database
    .select()
    .from(schema.analyses)
    .where(eq(schema.analyses.shareId, shareId))
    .limit(1)

  if (!analysis) return null

  const rows = await database
    .select()
    .from(schema.clauses)
    .where(eq(schema.clauses.analysisId, analysis.id))

  return {
    shareId: analysis.shareId,
    fileName: analysis.fileName,
    docType: analysis.docType,
    summary: analysis.summary,
    keyPoints: analysis.keyPoints,
    clauses: rows
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((row) => ({
        id: `c-${row.ordinal}`,
        heading: row.heading,
        sourceQuote: row.sourceQuote,
        plainLanguage: row.plainLanguage,
        risk: row.risk,
        riskReason: row.riskReason,
        obligationOn: row.obligationOn,
      })),
  }
}
