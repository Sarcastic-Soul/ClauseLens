import { loadAnalysis } from '@/lib/analysis-store'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { shareIdSchema } from '@/lib/schema'

/** Two reads, no model call. */
export const maxDuration = 10

/**
 * No model call, so no need to guard a metered API — but with no limit at all,
 * a caller could hammer the database trying every share id it can generate.
 * The cap is generous because a real client can legitimately reload a shared
 * analysis often.
 */
const REQUESTS_PER_MINUTE = 60

/** Loads a saved analysis by its share id. */
export async function GET(
  request: Request,
  context: RouteContext<'/api/a/[shareId]'>,
): Promise<Response> {
  try {
    await enforceRateLimit(clientKey(request, 'a'), REQUESTS_PER_MINUTE)

    const { shareId } = await context.params
    const parsed = shareIdSchema.safeParse(shareId)
    if (!parsed.success) throw new AppError(ERROR_CODES.NOT_FOUND, 'Malformed share id')

    const analysis = await loadAnalysis(parsed.data)
    if (!analysis) throw new AppError(ERROR_CODES.NOT_FOUND, `No analysis for ${parsed.data}`)

    return Response.json(analysis)
  } catch (error) {
    return toErrorResponse(error)
  }
}
