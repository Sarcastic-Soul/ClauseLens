import { ChevronDown } from 'lucide-react'

import { RiskBadge } from '@/components/RiskBadge'
import type { Clause, ObligationParty } from '@/lib/schema'

const OBLIGATION_LABELS: Record<ObligationParty, string> = {
  you: 'Binds you',
  counterparty: 'Binds the other party',
  both: 'Binds both parties',
  none: 'Informational',
}

/**
 * Uses a native disclosure element rather than a custom toggle: keyboard
 * operation, focus handling and screen-reader semantics come for free, and
 * there is no state to get wrong.
 */
export function ClauseCard({ clause }: { clause: Clause }) {
  return (
    <details
      id={clause.id}
      className="group scroll-mt-24 rounded-lg border border-border bg-surface open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
        <ChevronDown
          className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        <span className="flex-1">
          <span className="block font-medium">{clause.heading}</span>
          <span className="mt-1 block text-sm text-muted">{clause.plainLanguage}</span>
        </span>
        <RiskBadge risk={clause.risk} />
      </summary>

      <div className="space-y-4 border-t border-border px-4 pb-4 pt-4 text-sm">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Why it matters</h4>
          <p className="mt-1">{clause.riskReason}</p>
        </div>

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted">
            What the document says
          </h4>
          <blockquote className="mt-1 border-l-2 border-border pl-3 font-mono text-xs leading-relaxed text-muted">
            {clause.sourceQuote}
          </blockquote>
        </div>

        <p className="text-xs text-muted">{OBLIGATION_LABELS[clause.obligationOn]}</p>
      </div>
    </details>
  )
}
