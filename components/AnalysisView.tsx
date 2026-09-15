import { AskBox } from '@/components/AskBox'
import { ChecklistPanel } from '@/components/ChecklistPanel'
import { ClauseCard } from '@/components/ClauseCard'
import { RiskSummary } from '@/components/RiskSummary'
import { ShareLink } from '@/components/ShareLink'
import type { Grounding } from '@/lib/api-client'
import { toClauseContext } from '@/lib/clause-context'
import { type Analysis, UNRECOGNISED_DOC_TYPE } from '@/lib/schema'

/**
 * The result screen, shared by a fresh upload and a saved share link so both
 * render identically.
 */
export function AnalysisView({
  analysis,
  shareId,
  contextToken,
}: {
  analysis: Analysis
  shareId?: string | null
  /** Required only when there is no share id, i.e. the analysis was never saved. */
  contextToken?: string
}) {
  const unrecognised = analysis.docType === UNRECOGNISED_DOC_TYPE

  /**
   * A saved analysis is addressed by its share id, so nothing has to be sent
   * and nothing has to be trusted. An unsaved one sends its clauses with the
   * signature the analyse call issued for them.
   */
  const grounding: Grounding = shareId
    ? { shareId }
    : {
        clauseContext: toClauseContext(analysis.clauses),
        contextToken: contextToken ?? '',
        docType: analysis.docType,
      }

  return (
    <div className="space-y-10">
      <RiskSummary analysis={analysis} />

      {shareId && <ShareLink shareId={shareId} />}

      {unrecognised || analysis.clauses.length === 0 ? (
        <p className="text-sm text-muted">
          No clauses were extracted, so there is nothing to question or check. Upload a contract,
          agreement or offer letter to see the full analysis.
        </p>
      ) : (
        <>
          <section aria-labelledby="clauses-heading">
            <h2 id="clauses-heading" className="text-lg font-medium">
              Clauses
            </h2>
            <ul className="mt-4 space-y-3">
              {analysis.clauses.map((clause) => (
                <li key={clause.id}>
                  <ClauseCard clause={clause} />
                </li>
              ))}
            </ul>
          </section>

          <AskBox clauses={analysis.clauses} grounding={grounding} />

          <ChecklistPanel clauses={analysis.clauses} grounding={grounding} />
        </>
      )}
    </div>
  )
}
