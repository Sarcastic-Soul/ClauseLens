import { env } from '@/lib/env'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { generateStructured } from '@/lib/gemini'
import { COMPARE_SYSTEM_PROMPT, compareUserPrompt } from '@/lib/prompts'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { comparisonSchema } from '@/lib/schema'
import {
  ACCEPTED_MIME_TYPE,
  MAX_COMPARE_UPLOAD_BYTES,
  assertAcceptableSize,
  assertIsPdf,
} from '@/lib/upload'

export const maxDuration = 180

const REQUESTS_PER_MINUTE = 3

/**
 * GenAI touchpoint 5: comparison. The problem statement asks for help to
 * understand, *compare* and navigate legal documents, and comparing is the one
 * of the three a reader cannot do by reading each document in turn — the
 * differences are what matter, and they are exactly what is hardest to see.
 *
 * Both PDFs go to the model in a single call. Sending them together rather than
 * analysing each and diffing the results is what lets the model line up terms
 * that are worded differently but mean the same thing, which is most of them.
 *
 * Comparisons are not persisted. They are about a pairing rather than a
 * document, so there is nothing to cache and no share link to issue.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await enforceRateLimit(clientKey(request, 'compare'), REQUESTS_PER_MINUTE)

    const form = await request.formData()
    const [first, second] = [form.get('first'), form.get('second')]

    if (!(first instanceof File) || !(second instanceof File)) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Both "first" and "second" files are required')
    }

    const documents = await Promise.all([toDocumentPart(first), toDocumentPart(second)])

    const comparison = await generateStructured({
      model: env().GEMINI_MODEL_ANALYZE,
      systemInstruction: COMPARE_SYSTEM_PROMPT,
      prompt: compareUserPrompt(first.name, second.name),
      schema: comparisonSchema,
      documents,
    })

    return Response.json({
      comparison,
      fileNames: { first: first.name, second: second.name },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

async function toDocumentPart(file: File) {
  assertAcceptableSize(file.size, MAX_COMPARE_UPLOAD_BYTES)
  const bytes = new Uint8Array(await file.arrayBuffer())
  assertIsPdf(bytes)

  return { mimeType: ACCEPTED_MIME_TYPE, base64: Buffer.from(bytes).toString('base64') }
}
