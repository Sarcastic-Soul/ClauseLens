import type { Analysis, Checklist } from '@/lib/schema'

/**
 * Browser-side wrapper around the API. Route handlers always answer with either
 * a result or `{ error: { code, message } }`, so error handling lives here once
 * rather than in every component.
 */

export type AnalyzeResult = {
  analysis: Analysis
  shareId: string | null
  fileName: string
}

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export async function analyzeDocument(file: File, signal?: AbortSignal): Promise<AnalyzeResult> {
  const body = new FormData()
  body.append('file', file)

  const response = await fetch('/api/analyze', { method: 'POST', body, signal })
  return unwrap<AnalyzeResult>(response)
}

/**
 * Streams an answer, yielding the text accumulated so far. The caller re-parses
 * on every chunk, which is why `lib/answer-format.ts` tolerates partial input.
 */
export async function* askQuestion(
  body: { question: string; clauseContext?: string; shareId?: string },
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) await unwrap(response)
  if (!response.body) throw new ApiError('INTERNAL', 'The answer stream was empty.')

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let accumulated = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    accumulated += value
    yield accumulated
  }
}

export async function fetchChecklist(
  body: { docType: string; clauseContext: string },
  signal?: AbortSignal,
): Promise<Checklist> {
  const response = await fetch('/api/checklist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  return unwrap<Checklist>(response)
}

export async function sendFeedback(body: { rating: number; comment?: string }): Promise<void> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  await unwrap(response)
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(
      error?.code ?? 'INTERNAL',
      error?.message ?? 'Something went wrong. Try again.',
    )
  }

  return payload as T
}
