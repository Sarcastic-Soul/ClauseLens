import { loadAnalysis } from '@/lib/analysis-store'
import { AppError, ERROR_CODES, toErrorResponse } from '@/lib/errors'
import { shareIdSchema } from '@/lib/schema'

/** Loads a saved analysis by its share id. No model call, so no rate limit. */
export async function GET(
  _request: Request,
  context: RouteContext<'/api/a/[shareId]'>,
): Promise<Response> {
  try {
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
