import { AppError, ERROR_CODES } from '@/lib/errors'

/**
 * Upload rules. Kept below Vercel's 4.5 MB request body cap so an oversized
 * file is rejected with our own message instead of the platform's 413.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/**
 * Comparison sends two files in one request, and the 4.5 MB cap is on the whole
 * body, so each side gets half the budget rather than all of it.
 */
export const MAX_COMPARE_UPLOAD_BYTES = 2 * 1024 * 1024

export const ACCEPTED_MIME_TYPE = 'application/pdf'

/**
 * Multipart bodies carry boundaries, part headers and field names on top of the
 * file itself. The declared length is therefore always a little over the file
 * size, and the pre-read check allows for that rather than rejecting a file that
 * is within the cap.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

/** `%PDF-` — every PDF starts with it. Checked because a client can claim any MIME type. */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]

export function assertAcceptableSize(byteLength: number, limit = MAX_UPLOAD_BYTES): void {
  if (byteLength === 0) throw new AppError(ERROR_CODES.EMPTY_FILE, 'Zero-byte upload')
  if (byteLength > limit) {
    throw new AppError(ERROR_CODES.FILE_TOO_LARGE, `${byteLength} bytes exceeds ${limit}`)
  }
}

/**
 * Rejects an oversized request from its declared length, before the body is
 * read. `request.formData()` buffers the whole request into memory, so checking
 * `file.size` afterwards is already too late — the bytes have been read.
 *
 * `limit` is the budget for the whole body, which for comparison is both files.
 * A body with no `content-length` — a chunked upload — cannot be judged here and
 * is left to the per-file check.
 */
export function assertAcceptableBodySize(request: Request, limit = MAX_UPLOAD_BYTES): void {
  const header = request.headers.get('content-length')
  if (header === null) return

  const declared = Number(header)
  if (!Number.isFinite(declared)) return

  if (declared > limit + MULTIPART_OVERHEAD_BYTES) {
    throw new AppError(ERROR_CODES.FILE_TOO_LARGE, `body of ${declared} bytes exceeds ${limit}`)
  }
}

export function looksLikePdf(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte)
}

export function assertIsPdf(bytes: Uint8Array): void {
  if (!looksLikePdf(bytes)) {
    throw new AppError(ERROR_CODES.UNSUPPORTED_FILE_TYPE, 'File does not start with %PDF-')
  }
}
