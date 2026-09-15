import { db, schema } from '@/lib/db'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { assertSameOrigin } from '@/lib/origin-guard'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { feedbackRequestSchema } from '@/lib/schema'

/** One insert. Nothing here waits on a model, so the ceiling is short on purpose. */
export const maxDuration = 10

const REQUESTS_PER_MINUTE = 3

/**
 * Pilot feedback. This edition of the event exists to gather it, so collecting
 * it in the product rather than only in a form keeps the signal attached to the
 * thing being evaluated.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request)
    await enforceRateLimit(clientKey(request, 'feedback'), REQUESTS_PER_MINUTE)

    const body = await request.json().catch(() => null)
    const parsed = feedbackRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.INVALID_INPUT, parsed.error.message)
    }

    const database = db()
    if (!database) throw new AppError(ERROR_CODES.PERSISTENCE_UNAVAILABLE, 'No DATABASE_URL')

    await database.insert(schema.feedback).values({
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })

    return Response.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
