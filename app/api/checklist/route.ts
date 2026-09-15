import { env } from '@/lib/env'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { generateStructured } from '@/lib/gemini'
import { resolveGrounding } from '@/lib/grounding'
import { assertSameOrigin } from '@/lib/origin-guard'
import { CHECKLIST_SYSTEM_PROMPT, checklistUserPrompt } from '@/lib/prompts'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { checklistRequestSchema, checklistSchema } from '@/lib/schema'

export const maxDuration = 60

const REQUESTS_PER_MINUTE = 5

/**
 * GenAI touchpoint 4: turns the riskiest clauses into the questions to put to a
 * legal professional. This is where the product stops at the boundary the
 * problem statement sets — it prepares the reader for advice rather than
 * giving any.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request)
    await enforceRateLimit(clientKey(request, 'checklist'), REQUESTS_PER_MINUTE)

    const body = await request.json().catch(() => null)
    const parsed = checklistRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, parsed.error.message)
    }

    const { clauseContext, docType } = await resolveGrounding(parsed.data)

    const checklist = await generateStructured({
      model: env().GEMINI_MODEL_ANALYZE,
      systemInstruction: CHECKLIST_SYSTEM_PROMPT,
      prompt: checklistUserPrompt(docType, clauseContext),
      schema: checklistSchema,
    })

    return Response.json(checklist)
  } catch (error) {
    return toErrorResponse(error)
  }
}
