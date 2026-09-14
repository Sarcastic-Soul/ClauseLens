import type { Analysis } from '@/lib/schema'

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
