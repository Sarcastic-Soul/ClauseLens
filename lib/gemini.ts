import { GoogleGenAI } from '@google/genai'
import type { z } from 'zod'

import { env } from '@/lib/env'
import { AppError, ERROR_CODES } from '@/lib/errors'
import { toModelSchema } from '@/lib/schema'

/**
 * The only module that talks to the model. Route handlers call these two
 * functions and never touch the SDK, which keeps model choice, error mapping
 * and generation settings in one place — and makes the model stubbable in tests.
 */

let client: GoogleGenAI | null = null

function genai(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY })
  return client
}

/** Extraction and grounded answering are lookup tasks, not creative ones. */
const TEMPERATURE = 0.2

export type DocumentPart = { mimeType: string; base64: string }

type StructuredCall<T extends z.ZodType> = {
  model: string
  systemInstruction: string
  prompt: string
  schema: T
  /** Optional PDF sent inline. Gemini reads PDFs natively — we never parse them ourselves. */
  document?: DocumentPart
}

/**
 * Calls the model in JSON mode and validates the result against `schema`.
 * A response that does not match the schema is a `MODEL_BAD_OUTPUT` failure,
 * never a partially-populated object handed onward to the UI.
 */
export async function generateStructured<T extends z.ZodType>({
  model,
  systemInstruction,
  prompt,
  schema,
  document,
}: StructuredCall<T>): Promise<z.infer<T>> {
  const parts = [
    ...(document
      ? [{ inlineData: { mimeType: document.mimeType, data: document.base64 } }]
      : []),
    { text: prompt },
  ]

  const response = await call(() =>
    genai().models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        temperature: TEMPERATURE,
        responseMimeType: 'application/json',
        responseJsonSchema: toModelSchema(schema),
      },
    }),
  )

  const raw = response.text
  if (!raw) throw new AppError(ERROR_CODES.MODEL_BAD_OUTPUT, 'Model returned no text')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new AppError(ERROR_CODES.MODEL_BAD_OUTPUT, 'Model returned malformed JSON')
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new AppError(
      ERROR_CODES.MODEL_BAD_OUTPUT,
      `Model output failed validation: ${result.error.message}`,
    )
  }

  return result.data
}

/**
 * Streams plain text. Used for question answering so the UI fills in as the
 * answer arrives rather than sitting on a spinner.
 */
export async function* generateTextStream({
  model,
  systemInstruction,
  prompt,
}: {
  model: string
  systemInstruction: string
  prompt: string
}): AsyncGenerator<string> {
  const stream = await call(() =>
    genai().models.generateContentStream({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { systemInstruction, temperature: TEMPERATURE },
    }),
  )

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}

/** Maps SDK failures onto our error codes so no provider detail reaches the client. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof AppError) throw error

    const status = (error as { status?: number }).status
    const message = error instanceof Error ? error.message : String(error)

    if (status === 429 || /quota|rate limit|resource_exhausted/i.test(message)) {
      throw new AppError(ERROR_CODES.MODEL_RATE_LIMITED, message)
    }

    throw new AppError(ERROR_CODES.MODEL_UNAVAILABLE, message)
  }
}
