'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { ComparePane } from '@/components/ComparePane'
import { ComparisonView } from '@/components/ComparisonView'
import { Disclaimer } from '@/components/Disclaimer'
import { ApiError, compareDocuments, type CompareResult } from '@/lib/api-client'

type Status = 'idle' | 'comparing' | 'ready' | 'failed'

export default function ComparePage() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function compare(first: File, second: File) {
    setStatus('comparing')
    setError(null)
    setResult(null)

    try {
      setResult(await compareDocuments(first, second))
      setStatus('ready')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.')
      setStatus('failed')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <header>
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ClauseLens
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Compare two documents
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Two versions of an agreement, or two offers you are choosing between. You get what
          differs and which side each difference favours — judged from yours.
        </p>
      </header>

      <main>
        <div className="mt-8 space-y-6">
          <Disclaimer />
          <ComparePane onCompare={compare} busy={status === 'comparing'} />

          <div aria-live="polite" aria-atomic="true">
            {status === 'comparing' && (
              <div className="flex items-start gap-2 text-sm text-muted">
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" />
                <p>
                  Reading both documents and lining up their terms. This takes longer than a single
                  analysis — usually under a minute and a half.
                </p>
              </div>
            )}
            {status === 'failed' && error && (
              <p role="alert" className="text-sm text-risk-high">
                {error}
              </p>
            )}
          </div>
        </div>

        {status === 'ready' && result && (
          <div className="mt-10 border-t border-border pt-8">
            <ComparisonView comparison={result.comparison} fileNames={result.fileNames} />
          </div>
        )}
      </main>
    </div>
  )
}
