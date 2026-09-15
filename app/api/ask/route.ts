import { env } from '@/lib/env'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { generateTextStream } from '@/lib/gemini'
import { resolveClauseContext } from '@/lib/grounding'
import { assertSameOrigin } from '@/lib/origin-guard'
import { ASK_SYSTEM_PROMPT, askUserPrompt } from '@/lib/prompts'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { askRequestSchema } from '@/lib/schema'

export const maxDuration = 60

const REQUESTS_PER_MINUTE = 10

/**
 * GenAI touchpoint 3: grounded question answering.
 *
 * The response is streamed as plain text so the answer appears as it is
 * written. Structure the client needs — whether the question was answerable,
 * and which clauses were cited — travels inside that text and is parsed by
 * `lib/answer-format.ts`, which works on partial input.
 *
 * Clause context comes from the database when the analysis was saved, and from
 * the request — signed, so it can only be context this server produced — when it
 * was not. Either way the model only ever sees clauses from one document.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request)
    await enforceRateLimit(clientKey(request, 'ask'), REQUESTS_PER_MINUTE)

    const body = await request.json().catch(() => null)
    const parsed = askRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, parsed.error.message)
    }

    const clauseContext = await resolveClauseContext(parsed.data)
    const stream = generateTextStream({
      model: env().GEMINI_MODEL_QA,
      systemInstruction: ASK_SYSTEM_PROMPT,
      prompt: askUserPrompt(parsed.data.question, clauseContext),
    })

    return new Response(toReadableStream(stream), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

/**
 * Errors raised after the first byte cannot change the status code, so they are
 * logged and the stream closes. The client renders whatever arrived.
 */
function toReadableStream(source: AsyncGenerator<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await source.next()
        if (done) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(value))
      } catch (error) {
        console.error('[ask] stream failed', error)
        controller.close()
      }
    },
    cancel() {
      void source.return(undefined)
    },
  })
}
