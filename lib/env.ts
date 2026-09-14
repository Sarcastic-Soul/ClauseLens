import { z } from 'zod'

/**
 * Server-side environment. Never import this from a client component: it reads
 * the Gemini key and the database URL.
 *
 * Parsing is lazy so that a missing key fails on the first request that needs
 * it, with a clear message, rather than at build time on Vercel.
 */
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is not set'),
  GEMINI_MODEL_ANALYZE: z.string().min(1).default('gemini-3.6-flash'),
  GEMINI_MODEL_QA: z.string().min(1).default('gemini-3.5-flash-lite'),
  DATABASE_URL: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached

  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Invalid server environment: ${missing}. See .env.example.`)
  }

  cached = parsed.data
  return cached
}

/** Persistence is optional — the app analyses documents with or without it. */
export function isPersistenceEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL)
}
