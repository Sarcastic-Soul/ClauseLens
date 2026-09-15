'use client'

import { ClipboardList, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ApiError, fetchChecklist } from '@/lib/api-client'
import { toClauseContext } from '@/lib/clause-context'
import type { Checklist, Clause } from '@/lib/schema'

/**
 * The end of what this product will do: it prepares the reader to get advice
 * rather than offering any. Only the riskiest clauses are sent, which keeps the
 * questions specific and the request small.
 */
export function ChecklistPanel({ docType, clauses }: { docType: string; clauses: Clause[] }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const notable = clauses.filter((clause) => clause.risk !== 'low')

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      setChecklist(
        await fetchChecklist({
          docType,
          clauseContext: toClauseContext(notable.length > 0 ? notable : clauses),
        }),
      )
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'The checklist could not be prepared.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (notable.length === 0 && clauses.length === 0) return null

  return (
    <section aria-labelledby="checklist-heading" className="space-y-4">
      <div>
        <h2 id="checklist-heading" className="text-lg font-medium">
          Prepare for a lawyer
        </h2>
        <p className="mt-1 text-sm text-muted">
          The questions worth asking about the {notable.length} clauses that carry real
          consequences.
        </p>
      </div>

      {!checklist && (
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ClipboardList className="size-4" aria-hidden="true" />
          )}
          {busy ? 'Preparing questions…' : 'Prepare my questions'}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-risk-high">
          {error}
        </p>
      )}

      {checklist && (
        <ol className="space-y-3">
          {checklist.items.map((item, index) => (
            <li key={item.question} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium">
                <span className="mr-2 text-muted">{index + 1}.</span>
                {item.question}
              </p>
              <p className="mt-1.5 pl-6 text-sm text-muted">{item.why}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
