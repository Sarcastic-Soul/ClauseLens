import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

/**
 * `/api/ask` and `/api/checklist` need the document's clauses as grounding
 * context. When an analysis was saved, that context is read from the database
 * by share id and nothing has to cross the wire. When it was not — the database
 * was unreachable, and the analysis exists only in the browser — the client has
 * to send the context back.
 *
 * Accepting arbitrary text there would turn a public endpoint into a general
 * question-answering proxy on our API key. So the analyse response carries a
 * token: an HMAC of the exact context the model produced. The client returns
 * both, and the endpoint answers only over context that this server generated.
 *
 * The token authenticates the context, not the user. It carries no identity, no
 * expiry, and no authority beyond "these clauses came from an analysis we ran".
 */

/**
 * Signing key. `ASK_CONTEXT_SECRET` when set; otherwise derived from the Gemini
 * key, which every deployment already has, so the protection is on by default
 * rather than waiting on one more environment variable to be remembered.
 *
 * Derivation is one-way: an HMAC made with this key cannot be walked back to the
 * API key it came from.
 */
let cachedKey: Buffer | null = null

function signingKey(): Buffer {
  if (cachedKey) return cachedKey

  const configured = process.env.ASK_CONTEXT_SECRET
  cachedKey = configured
    ? Buffer.from(configured, 'utf8')
    : Buffer.from(
        hkdfSync('sha256', env().GEMINI_API_KEY, 'clauselens-context', 'context-token-v1', 32),
      )

  return cachedKey
}

export function signContext(context: string): string {
  return createHmac('sha256', signingKey()).update(context, 'utf8').digest('base64url')
}

/** Constant-time comparison: a timing side channel here would leak the key. */
export function verifyContext(context: string, token: string | undefined): boolean {
  if (!token) return false

  const expected = Buffer.from(signContext(context), 'utf8')
  const supplied = Buffer.from(token, 'utf8')

  if (expected.length !== supplied.length) return false
  return timingSafeEqual(expected, supplied)
}

/** Test seam: the derived key is module state. */
export function resetSigningKey(): void {
  cachedKey = null
}
