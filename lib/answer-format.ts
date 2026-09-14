import { NOT_IN_DOCUMENT } from '@/lib/prompts'

/**
 * Answers stream as plain text so the UI fills in progressively, which rules
 * out JSON mode for that one call. The structure we still need — was the
 * question answerable, and which clauses were cited — is carried in the text
 * itself and parsed here.
 *
 * Both functions are pure and run on partial text, so the client can call them
 * on every chunk while the answer is still arriving.
 */

const CITATION_PATTERN = /\[(c-\d+)\]/g

export type ParsedAnswer = {
  /** False when the model reported the document does not cover the question. */
  answerable: boolean
  /** Answer text with citation markers removed, ready to render. */
  text: string
  /** Clause ids cited, in first-appearance order, without duplicates. */
  citedClauseIds: string[]
}

export function parseAnswer(raw: string): ParsedAnswer {
  const trimmed = raw.trimStart()

  if (trimmed.startsWith(NOT_IN_DOCUMENT)) {
    return {
      answerable: false,
      text: trimmed.slice(NOT_IN_DOCUMENT.length).trim(),
      citedClauseIds: [],
    }
  }

  return {
    answerable: true,
    text: stripCitations(raw),
    citedClauseIds: extractCitedClauseIds(raw),
  }
}

export function extractCitedClauseIds(raw: string): string[] {
  const ids = [...raw.matchAll(CITATION_PATTERN)].map((match) => match[1])
  return [...new Set(ids)]
}

function stripCitations(raw: string): string {
  return raw.replace(CITATION_PATTERN, '').replace(/[ \t]+([.,;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim()
}
