import { contentHashOf, findAnalysisByContentHash, saveAnalysis } from '@/lib/analysis-store'
import { toClauseContext } from '@/lib/clause-context'
import { signContext } from '@/lib/context-token'
import { env } from '@/lib/env'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { generateStructured } from '@/lib/gemini'
import { ANALYZE_SYSTEM_PROMPT, analyzeUserPrompt } from '@/lib/prompts'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { type Analysis, extractedAnalysisSchema, withClauseIds } from '@/lib/schema'
import { ACCEPTED_MIME_TYPE, assertAcceptableSize, assertIsPdf } from '@/lib/upload'

/** Long enough for a large document; well inside the platform ceiling. */
export const maxDuration = 120

const REQUESTS_PER_MINUTE = 5

/**
 * GenAI touchpoint 1 and 2: clause extraction and document summary, in a single
 * structured call to Gemini. The PDF is sent inline — Gemini reads PDFs
 * natively, so nothing in this project parses one.
 *
 * A document that has been analysed before is served from the database instead.
 * The model is metered; asking it the same question twice is the one cost in
 * this design that buys nothing at all.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await enforceRateLimit(clientKey(request, 'analyze'), REQUESTS_PER_MINUTE)

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Request had no "file" field')
    }

    assertAcceptableSize(file.size)
    const bytes = new Uint8Array(await file.arrayBuffer())
    assertIsPdf(bytes)

    const contentHash = contentHashOf(bytes)

    /**
     * A cache hit answers with the stored analysis but the caller's own file
     * name: two people can upload the same standard agreement under different
     * names, and the earlier uploader's name is not this uploader's business.
     */
    const cached = await findAnalysisByContentHash(contentHash)
    if (cached) {
      return respond(cached, cached.shareId, file.name, true)
    }

    const model = env().GEMINI_MODEL_ANALYZE
    const extracted = await generateStructured({
      model,
      systemInstruction: ANALYZE_SYSTEM_PROMPT,
      prompt: analyzeUserPrompt(file.name),
      schema: extractedAnalysisSchema,
      documents: [{ mimeType: ACCEPTED_MIME_TYPE, base64: Buffer.from(bytes).toString('base64') }],
    })

    const analysis = withClauseIds(extracted)
    const shareId = await saveAnalysis({ analysis, fileName: file.name, modelId: model, contentHash })

    return respond(analysis, shareId, file.name, false)
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * The response carries a signed copy of the clause context so that follow-up
 * questions work even when the analysis could not be saved. See
 * `lib/context-token.ts` for why the signature is there.
 */
function respond(
  analysis: Analysis,
  shareId: string | null,
  fileName: string,
  cached: boolean,
): Response {
  const clauseContext = toClauseContext(analysis.clauses)

  return Response.json({
    analysis,
    shareId,
    fileName,
    cached,
    contextToken: signContext(clauseContext),
  })
}
