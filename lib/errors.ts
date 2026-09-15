/**
 * Every failure the user can reach is one of these codes. Route handlers throw
 * or return an AppError; nothing else is sent to the client, so internal
 * messages and stack traces never leak into a response.
 */
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  FORBIDDEN: 'FORBIDDEN',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  EMPTY_FILE: 'EMPTY_FILE',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  MODEL_RATE_LIMITED: 'MODEL_RATE_LIMITED',
  MODEL_BAD_OUTPUT: 'MODEL_BAD_OUTPUT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  PERSISTENCE_UNAVAILABLE: 'PERSISTENCE_UNAVAILABLE',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

const STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  EMPTY_FILE: 400,
  MODEL_UNAVAILABLE: 503,
  MODEL_RATE_LIMITED: 429,
  MODEL_BAD_OUTPUT: 502,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PERSISTENCE_UNAVAILABLE: 503,
  INTERNAL: 500,
}

/** Shown to the user verbatim. Written to be actionable, not apologetic. */
const USER_MESSAGE: Record<ErrorCode, string> = {
  INVALID_INPUT: 'That request was not valid. Check the form and try again.',
  FORBIDDEN: 'That request was not accepted from this origin.',
  FILE_TOO_LARGE: 'That file is too large. Upload a PDF under 4 MB.',
  UNSUPPORTED_FILE_TYPE: 'Only PDF documents can be analysed.',
  EMPTY_FILE: 'That file is empty. Choose a PDF with content in it.',
  MODEL_UNAVAILABLE: 'The analysis service is unavailable right now. Try again in a moment.',
  MODEL_RATE_LIMITED: 'The analysis service is busy. Wait a few seconds and try again.',
  MODEL_BAD_OUTPUT: 'The analysis came back unreadable. Try again, or try a different document.',
  NOT_FOUND: 'That analysis does not exist, or the link has expired.',
  RATE_LIMITED: 'Too many requests from this device. Wait a minute and try again.',
  PERSISTENCE_UNAVAILABLE: 'Saving is unavailable, so this analysis cannot be shared right now.',
  INTERNAL: 'Something went wrong on our side. Try again.',
}

export class AppError extends Error {
  readonly code: ErrorCode

  /** @param detail Internal context for server logs. Never sent to the client. */
  constructor(code: ErrorCode, detail?: string) {
    super(detail ?? code)
    this.name = 'AppError'
    this.code = code
  }

  get status(): number {
    return STATUS[this.code]
  }

  get userMessage(): string {
    return USER_MESSAGE[this.code]
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.userMessage } },
      { status: this.status },
    )
  }
}

/**
 * Converts anything thrown inside a route handler into a safe response. The
 * original error is logged server-side; the client only ever sees a code and a
 * human-readable message.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) console.error(`[${error.code}]`, error.message)
    return error.toResponse()
  }

  console.error('[UNHANDLED]', error)
  return new AppError(ERROR_CODES.INTERNAL).toResponse()
}
