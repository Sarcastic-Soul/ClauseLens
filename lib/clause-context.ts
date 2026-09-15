import type { Clause } from '@/lib/schema'

/**
 * Serialises clauses into the grounding block sent with follow-up questions and
 * checklist requests. Pure, and used on both sides of the wire: the client
 * builds it for an unsaved analysis, the server rebuilds it from the database
 * for a shared one, and both produce identical text.
 */
export function toClauseContext(clauses: Clause[]): string {
  return clauses
    .map(
      (clause) =>
        `[${clause.id}] ${clause.heading} (${clause.risk} risk)\n"${clause.sourceQuote}"\n${clause.plainLanguage}`,
    )
    .join('\n\n')
}
