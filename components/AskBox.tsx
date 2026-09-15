'use client'

import { CornerDownLeft, Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

import { parseAnswer, type ParsedAnswer } from '@/lib/answer-format'
import { ApiError, askQuestion, type Grounding } from '@/lib/api-client'
import type { Clause } from '@/lib/schema'

type Exchange = { question: string; parsed: ParsedAnswer }

/**
 * Answers stream in, so the box fills as the model writes rather than sitting
 * on a spinner. Citations are rendered as buttons that jump to the clause the
 * answer came from — the grounding is checkable, not just asserted.
 */
export function AskBox({ clauses, grounding }: { clauses: Clause[]; grounding: Grounding }) {
  const inputId = useId()
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState<string | null>(null)
  const [streaming, setStreaming] = useState<ParsedAnswer | null>(null)
  const [history, setHistory] = useState<Exchange[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const asked = question.trim()
    if (!asked || busy) return

    setBusy(true)
    setError(null)
    setStreaming(null)
    setAsking(asked)
    setQuestion('')

    let latest: ParsedAnswer | null = null

    try {
      for await (const text of askQuestion({ question: asked, ...grounding })) {
        latest = parseAnswer(text)
        setStreaming(latest)
      }
      if (latest) setHistory((previous) => [...previous, { question: asked, parsed: latest! }])
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That question could not be answered.')
    } finally {
      setStreaming(null)
      setAsking(null)
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="ask-heading" className="space-y-4">
      <div>
        <h2 id="ask-heading" className="text-lg font-medium">
          Ask about this document
        </h2>
        <p className="mt-1 text-sm text-muted">
          Answers come only from the clauses above. Anything the document does not cover is said to
          be uncovered, not guessed at.
        </p>
      </div>

      <ol className="space-y-4">
        {history.map((exchange, index) => (
          <li key={`${exchange.question}-${index}`}>
            <AnswerBlock question={exchange.question} parsed={exchange.parsed} clauses={clauses} />
          </li>
        ))}
        {asking && streaming && (
          <li>
            <AnswerBlock question={asking} parsed={streaming} clauses={clauses} streaming />
          </li>
        )}
      </ol>

      <form onSubmit={submit} className="space-y-2">
        <label htmlFor={inputId} className="sr-only">
          Your question about this document
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={busy}
            placeholder="Can the landlord keep my whole deposit?"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || question.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <CornerDownLeft className="size-4" aria-hidden="true" />
            )}
            Ask
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-risk-high">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}

function AnswerBlock({
  question,
  parsed,
  clauses,
  streaming = false,
}: {
  question: string
  parsed: ParsedAnswer
  clauses: Clause[]
  streaming?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium">{question}</p>
      <div aria-live="polite" aria-busy={streaming}>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {parsed.answerable ? parsed.text : `Not in this document. ${parsed.text}`}
        </p>
      </div>
      {parsed.citedClauseIds.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {parsed.citedClauseIds.map((id) => {
            const clause = clauses.find((candidate) => candidate.id === id)
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent"
                >
                  {clause?.heading ?? id}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
