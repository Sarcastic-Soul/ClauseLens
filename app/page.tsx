'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { AnalysisView } from '@/components/AnalysisView'
import { Disclaimer } from '@/components/Disclaimer'
import { FeedbackWidget } from '@/components/FeedbackWidget'
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

      <main>
        <div className="mt-8 space-y-6">
          <Disclaimer />
          <UploadPane onSelect={analyse} busy={status === 'analysing'} />

          <div aria-live="polite" aria-atomic="true">
            {status === 'analysing' && <AnalysingNotice />}
            {status === 'failed' && error && (
              <p role="alert" className="text-sm text-risk-high">
                {error}
              </p>
            )}
          </div>
        </div>

        {status === 'ready' && result && (
          <div className="mt-10 border-t border-border pt-8">
            <AnalysisView analysis={result.analysis} shareId={result.shareId} />

            <div className="mt-12 border-t border-border pt-8">
              <FeedbackWidget />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * A full document takes the better part of a minute to read. Saying what is
 * happening, and roughly how long it takes, is more honest than a bare spinner.
 */
function AnalysingNotice() {
  return (
    <div className="flex items-start gap-2 text-sm text-muted">
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
      <p>
        Reading the document and extracting clauses. This usually takes 20 to 60 seconds — every
        clause is quoted from the original, so nothing is skimmed.
      </p>
    </div>
  )
}
