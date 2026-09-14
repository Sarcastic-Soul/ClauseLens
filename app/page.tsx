'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ClauseCard } from '@/components/ClauseCard'
import { Disclaimer } from '@/components/Disclaimer'
import { RiskSummary } from '@/components/RiskSummary'
import { UploadPane } from '@/components/UploadPane'
import { analyzeDocument, ApiError, type AnalyzeResult } from '@/lib/api-client'

type Status = 'idle' | 'analysing' | 'ready' | 'failed'

export default function Home() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyse(file: File) {
    setStatus('analysing')
    setError(null)
    setResult(null)

    try {
      setResult(await analyzeDocument(file))
      setStatus('ready')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
      setStatus('failed')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ClauseLens</h1>
        <p className="mt-2 max-w-xl text-muted">
          Rental agreements, offer letters and contracts, read clause by clause and explained in
          plain language — with the terms that could cost you flagged.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <Disclaimer />

        <UploadPane onSelect={analyse} busy={status === 'analysing'} />

        <div aria-live="polite" aria-atomic="true">
          {status === 'analysing' && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Reading the document and extracting clauses…
            </p>
          )}
          {status === 'failed' && error && (
            <p role="alert" className="text-sm text-risk-high">
              {error}
            </p>
          )}
        </div>
      </div>

      {status === 'ready' && result && (
        <main className="mt-10 space-y-8 border-t border-border pt-8">
          <RiskSummary analysis={result.analysis} />

          {result.analysis.clauses.length > 0 && (
            <section aria-labelledby="clauses-heading">
              <h2 id="clauses-heading" className="text-lg font-medium">
                Clauses
              </h2>
              <ul className="mt-4 space-y-3">
                {result.analysis.clauses.map((clause) => (
                  <li key={clause.id}>
                    <ClauseCard clause={clause} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      )}
    </div>
  )
}
