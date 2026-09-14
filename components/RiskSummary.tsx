import { RISK_LEVELS, type Analysis, UNRECOGNISED_DOC_TYPE } from '@/lib/schema'
import { RiskBadge } from '@/components/RiskBadge'

function countByRisk(analysis: Analysis) {
  return RISK_LEVELS.map((risk) => ({
    risk,
    count: analysis.clauses.filter((clause) => clause.risk === risk).length,
  })).filter((entry) => entry.count > 0)
}

export function RiskSummary({ analysis }: { analysis: Analysis }) {
  const unrecognised = analysis.docType === UNRECOGNISED_DOC_TYPE
  const counts = countByRisk(analysis)

  return (
    <section aria-labelledby="summary-heading" className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {unrecognised ? 'Not a legal agreement' : analysis.docType}
        </p>
        <h2 id="summary-heading" className="mt-1 text-lg font-medium">
          {unrecognised ? 'This does not look like a contract' : 'What this document does'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{analysis.summary}</p>
      </div>

      {counts.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Clauses by risk level">
          {counts.map(({ risk, count }) => (
            <li key={risk} className="flex items-center gap-1.5">
              <RiskBadge risk={risk} />
              <span className="text-sm text-muted">
                {count} {count === 1 ? 'clause' : 'clauses'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {analysis.keyPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Before you sign</h3>
          <ul className="mt-2 space-y-2">
            {analysis.keyPoints.map((point) => (
              <li key={point} className="flex gap-2 text-sm leading-relaxed text-muted">
                <span aria-hidden="true">&bull;</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
