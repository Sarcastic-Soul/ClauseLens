import { env } from '@/lib/env'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { generateStructured } from '@/lib/gemini'
import { ANALYZE_SYSTEM_PROMPT, analyzeUserPrompt } from '@/lib/prompts'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { saveAnalysis } from '@/lib/analysis-store'
import { extractedAnalysisSchema, withClauseIds } from '@/lib/schema'
import { ACCEPTED_MIME_TYPE, assertAcceptableSize, assertIsPdf } from '@/lib/upload'

/** Long enough for a large document; well inside the platform ceiling. */
export const maxDuration = 120

const REQUESTS_PER_MINUTE = 5

/**
 * GenAI touchpoint 1 and 2: clause extraction and document summary, in a single
 * structured call to Gemini. The PDF is sent inline — Gemini reads PDFs
 * natively, so nothing in this project parses one.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(clientKey(request, 'analyze'), REQUESTS_PER_MINUTE)

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, 'Request had no "file" field')
    }

    assertAcceptableSize(file.size)
    const bytes = new Uint8Array(await file.arrayBuffer())
    assertIsPdf(bytes)

    const model = env().GEMINI_MODEL_ANALYZE
    const extracted = await generateStructured({
      model,
      systemInstruction: ANALYZE_SYSTEM_PROMPT,
      prompt: analyzeUserPrompt(file.name),
      schema: extractedAnalysisSchema,
      document: {
        mimeType: ACCEPTED_MIME_TYPE,
        base64: Buffer.from(bytes).toString('base64'),
      },
    })

    const analysis = withClauseIds(extracted)
    const shareId = await saveAnalysis({ analysis, fileName: file.name, modelId: model })

    return Response.json({ analysis, shareId, fileName: file.name })
  } catch (error) {
    return toErrorResponse(error)
  }
}
