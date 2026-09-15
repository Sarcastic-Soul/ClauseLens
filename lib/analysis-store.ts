import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { toClauseContext } from '@/lib/clause-context'
import { db, schema } from '@/lib/db'
import { AppError, ERROR_CODES } from '@/lib/errors'
import type { Analysis } from '@/lib/schema'

/**
 * Saving and loading analyses. Every function here tolerates the database being
 * absent or unreachable: a failed save costs the share link, not the analysis
 * the user is already looking at.
 */

const SHARE_ID_LENGTH = 16

/**
 * Neon suspends an idle compute after five minutes on the free plan, and the
 * query that wakes it can fail before the connection is ready. One retry turns
 * that from a visible error into a slightly slower page load.
 */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (first) {
    console.warn('[db] first attempt failed, retrying', first)
    await new Promise((resolve) => setTimeout(resolve, 400))
    return operation()
  }
}

export type StoredAnalysis = Analysis & { shareId: string; fileName: string }

export function newShareId(): string {
  return nanoid(SHARE_ID_LENGTH)
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
    const [row] = await withRetry(() =>
      database
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
        .returning({ id: schema.analyses.id }),
    )

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

/**
 * Reads only the grounding block for a saved analysis. Answering a question
 * needs nothing else, so this avoids loading every clause row to rebuild text
 * that was already serialised at save time.
 */
export async function loadClauseContext(shareId: string): Promise<string | null> {
  const database = db()
  if (!database) return null

  try {
    const [row] = await withRetry(() =>
      database
        .select({ clauseContext: schema.analyses.clauseContext })
        .from(schema.analyses)
        .where(eq(schema.analyses.shareId, shareId))
        .limit(1),
    )
    return row?.clauseContext ?? null
  } catch (error) {
    console.error('[loadClauseContext]', error)
    throw new AppError(ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'Could not read the saved analysis')
  }
}

/**
 * Loads a shared analysis. Returns null when the id is unknown; throws a typed
 * `PERSISTENCE_UNAVAILABLE` when the database itself cannot be reached, so a
 * missing link and a broken database do not look the same to the caller.
 */
export async function loadAnalysis(shareId: string): Promise<StoredAnalysis | null> {
  const database = db()
  if (!database) return null

  try {
    return await read(database, shareId)
  } catch (error) {
    console.error('[loadAnalysis]', error)
    throw new AppError(ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'Could not read the saved analysis')
  }
}

async function read(
  database: NonNullable<ReturnType<typeof db>>,
  shareId: string,
): Promise<StoredAnalysis | null> {
  const [analysis] = await withRetry(() =>
    database
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.shareId, shareId))
      .limit(1),
  )

  if (!analysis) return null

  const rows = await withRetry(() =>
    database.select().from(schema.clauses).where(eq(schema.clauses.analysisId, analysis.id)),
  )

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
