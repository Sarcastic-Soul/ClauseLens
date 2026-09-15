# ClauseLens

**Understand what you are signing.** Upload a rental agreement, offer letter or contract and get
it back clause by clause — in plain language, with the terms that could cost you flagged, every
explanation quoted from the original, and the questions worth putting to a lawyer.

Built for **PromptWars: Virtual (Exclusive Edition)** against the problem statement
**AI for Legal Assistance & Access**:

> Legal information can often be complex, difficult to understand, and challenging to navigate
> without professional assistance. Build a GenAI-powered solution that makes legal information and
> basic legal assistance more accessible by helping users understand, compare, and navigate legal
> documents and information.

**This is not legal advice.** ClauseLens explains what a document says and who it binds. It never
states what you should legally do, and the boundary is enforced in the prompts themselves, not only
in a banner.

## Live

**<https://clauselens-mu.vercel.app>** — no login, no signup. Upload a PDF, or use one of the
one-click samples on the page. [`/compare`](https://clauselens-mu.vercel.app/compare) puts two
documents side by side.

Three analyses are already saved, so the product can be read without uploading anything. Each was
produced by the same code path from a different document, which is the quickest way to see that the
output tracks the input rather than being fixed:

| Document | Analysis | What it shows |
|---|---|---|
| Residential rent agreement | [`/a/0xd2pGQQsYyj8876`](https://clauselens-mu.vercel.app/a/0xd2pGQQsYyj8876) | 12 clauses; a ten-month security deposit and a lock-in period flagged high |
| Employment offer letter | [`/a/_nnDJT7eGYjZrZKx`](https://clauselens-mu.vercel.app/a/_nnDJT7eGYjZrZKx) | 9 clauses; a joining-bonus clawback and a notice-period buyout flagged high |
| Freelance contractor agreement | [`/a/ClVIjc_HMf2VBmcc`](https://clauselens-mu.vercel.app/a/ClVIjc_HMf2VBmcc) | 11 clauses; IP assignment, indemnity and payment timelines flagged high |

Follow-up questions work on a saved analysis too — the clauses are the grounding context, so a
shared link is a complete, usable copy of the tool.

On [`/compare`](https://clauselens-mu.vercel.app/compare), the "Two rent agreements" sample pair
puts the document above against the same agreement drafted fairly: a two-month deposit instead of
ten, a mutual lock-in, repairs on the landlord, deductions itemised. Eleven differences come back,
each labelled with the side it favours.

---

## How it addresses the problem statement

| Problem statement use case | Feature | Where |
|---|---|---|
| Simplifying complex legal documents | Every clause rewritten in everyday language | `lib/prompts.ts` → `ANALYZE_SYSTEM_PROMPT`, `app/api/analyze/route.ts` |
| Highlighting important clauses, obligations, risks | Risk level, one-line reason, and which party is bound, per clause | `components/ClauseCard.tsx`, `components/RiskSummary.tsx` |
| Answering questions based on provided documents | Q&A grounded only in the uploaded document, with clause citations | `app/api/ask/route.ts`, `components/AskBox.tsx` |
| Helping users understand their options and next steps | Top-five "before you sign" points | `lib/schema.ts` → `keyPoints` |
| Helping users prepare questions for a legal professional | Generated question checklist from the riskiest clauses | `app/api/checklist/route.ts`, `components/ChecklistPanel.tsx` |
| Comparing legal documents | Two documents side by side: what differs, and which side each difference favours | `app/api/compare/route.ts`, `components/ComparisonView.tsx` |
| Generating summaries, checklists, actionable outputs | Document summary, risk counts, shareable permalink | `components/AnalysisView.tsx` |

The documents targeted are Indian — leave and licence agreements, offer letters, contractor
agreements. The prompts name those conventions explicitly (lock-in separate from notice period,
deposits quoted in months of rent, lakh and crore digit grouping, TDS and GST), because generic
contract vocabulary misses them.

## GenAI architecture

All generative work runs on the **Google Gemini API** (`@google/genai`). There are five call sites,
and every one of them lives behind `lib/gemini.ts` — no route talks to the SDK directly.

| # | Where | Trigger | Model | Mode | Output |
|---|---|---|---|---|---|
| 1 | `app/api/analyze/route.ts` | A document is uploaded | `GEMINI_MODEL_ANALYZE` | JSON mode, PDF sent inline | Clause array: verbatim quote, plain-language rewrite, risk level, risk reason, obligated party |
| 2 | `app/api/analyze/route.ts` (same call) | A document is uploaded | `GEMINI_MODEL_ANALYZE` | JSON mode | Document type, summary, top-five key points |
| 3 | `app/api/ask/route.ts` | A question is asked | `GEMINI_MODEL_QA` | Streamed text | Grounded answer with inline `[c-4]` citations, or an explicit "not in this document" |
| 4 | `app/api/checklist/route.ts` | "Prepare my questions" | `GEMINI_MODEL_ANALYZE` | JSON mode | Questions to ask a legal professional, ordered by what is at stake |
| 5 | `app/api/compare/route.ts` | Two documents are uploaded | `GEMINI_MODEL_ANALYZE` | JSON mode, both PDFs in one call | Differences by topic, what each document says, and which side each difference favours |

Notes on the integration:

- **Gemini reads the PDF natively.** Nothing in this repository parses a PDF. Document layout,
  headings and tables survive, and there is no extraction dependency to ship.
- **Structured calls use JSON mode**, with the response schema derived from the same Zod schema that
  validates it on the way back (`lib/schema.ts` → `toModelSchema`). A response that does not match
  is a failure, never a half-populated object handed to the UI.
- **Model ids are configuration, not code**, and each may be a comma-separated chain. The newest
  Flash models return `503 UNAVAILABLE` on the free tier when demand spikes, so a request falls
  through to the next model rather than failing.
- **Comparison sends both PDFs in one call** rather than analysing each and diffing the results.
  Terms that mean the same thing are worded differently in every pair of contracts, and lining those
  up is what the model is for; a diff of two separate analyses would report wording changes as
  substantive ones.
- **Q&A streams**, which rules out JSON mode for that call. The structure still needed — answerable
  or not, and which clauses were cited — travels inside the text and is parsed by
  `lib/answer-format.ts`, which is pure and tolerates partial input.

## Grounding, and why answers can be checked

Every clause carries a `sourceQuote` copied verbatim from the document; a clause the model cannot
quote does not appear. Answers cite clause ids, and each citation in the UI is a link to the clause
it came from. Clause ids are assigned by the application after extraction, never by the model, so a
citation can never point at an id the model invented.

Uploaded documents are treated as untrusted input. Document text is fenced in a delimited block and
the model is instructed to treat everything inside as data — a contract containing "ignore your
instructions" is a realistic case for this problem statement, not a hypothetical one.

## Running locally

```bash
pnpm install
cp .env.example .env     # then fill in GEMINI_API_KEY and DATABASE_URL
pnpm db:migrate
pnpm dev
```

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey).
- `DATABASE_URL` — a [Neon](https://console.neon.tech) Postgres connection string. **Optional**:
  without it the app still analyses documents, it just cannot save or share them.

Sample documents are in `public/samples/` and are offered as one-click examples in the UI, so the
app can be tried without finding a contract first. They are synthetic — see `samples/README.md`.

```bash
pnpm test        # unit tests
pnpm typecheck
pnpm lint
```

## Architecture

```
Browser ──► Next.js route handlers ──► Gemini API
                     │
                     └──────────────► Neon Postgres
```

One Next.js application on Vercel. No separate backend, no queue, no container.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | One repository, one deployment, route handlers beside the UI |
| Model | Google Gemini via `@google/genai` | Native PDF input, JSON mode, free tier |
| Database | Neon Postgres + Drizzle | HTTP driver over `fetch`, so serverless invocations hold no connections and there is no pool to exhaust |
| UI | Tailwind CSS 4 | No component library to ship |
| Validation | Zod | One schema validates requests, derives the model schema, and types the UI |

**The database is never on the critical path for a fresh upload.** Analysis is returned first and
saved afterwards, so a database failure costs the share link, not the result on screen.

**The uploaded PDF is never stored.** Only the extracted analysis and the clause text needed to
ground follow-up questions are persisted.

**Questions and answers are never stored.** A share link is readable by anyone who has it, so
recording what one visitor asked would expose it to the next.

### Layout

```
app/
  api/analyze/      clause extraction and summary      (GenAI 1, 2)
  api/ask/          grounded question answering        (GenAI 3)
  api/checklist/    questions for a legal professional (GenAI 4)
  api/compare/      two documents, what differs          (GenAI 5)
  api/a/[shareId]/  load a saved analysis
  api/feedback/     pilot feedback
  a/[shareId]/      shared analysis page
  compare/          two-document comparison
lib/
  gemini.ts         the only module that calls the model
  prompts.ts        every instruction sent to the model
  schema.ts         Zod schemas: requests, model output, domain types
  answer-format.ts  citation and refusal parsing (pure)
  context-token.ts  signs clause context so it cannot be forged (pure)
  grounding.ts      resolves what a follow-up call answers over
  clause-context.ts grounding block shared by client and server (pure)
  analysis-store.ts persistence, tolerant of an absent database
  rate-limit.ts     per-IP windows, counted in Postgres across instances
  errors.ts         typed failures mapped to safe user-facing messages
```

## Reliability and limits

| Concern | Handling |
|---|---|
| Newest Flash models return 503 on the free tier | Comma-separated model chain with failover |
| Neon suspends idle computes after 5 minutes | One automatic retry on the first query |
| Public endpoints proxying a metered API | Per-IP rate limits on every model-calling route, counted in Postgres so every serverless instance shares one window |
| Vercel caps request bodies at 4.5 MB | 4 MB upload cap, enforced in the browser and again on the server |
| A renamed file claiming to be a PDF | `%PDF-` magic bytes checked server-side |
| A document that is not a contract | Reported as `unrecognised` with no clauses invented |
| A question the document cannot answer | Answered as "not in this document" rather than guessed |
| Model returns malformed JSON | Schema validation fails the request with a clear message |
| The same document is uploaded twice | Served from the database on its content hash; no second model call |
| Two documents too unalike to compare | Reported as not comparable rather than differences invented |

Analysis takes roughly 20 to 60 seconds for a multi-page contract, because every clause is quoted
from the original rather than summarised loosely.

### Local networks without IPv6

Neon's hostnames resolve to both IPv4 and IPv6. On a network with no working IPv6 route, Node still
races the IPv6 address and the connection times out as a bare `fetch failed`, which reads like a
credentials problem and is not. `instrumentation.ts` loads `instrumentation-node.ts` in development, which
prefers IPv4 and disables that race; `scripts/migrate.mjs` does the same. Production is left on
the Node defaults.

## Security

The uploaded PDF is never stored, secrets are server-side only, every input is validated with Zod
before use, uploaded documents are treated as untrusted input to the model, follow-up calls answer
only over clause context this server signed, and the public model-calling routes are rate limited
against a counter shared by every serverless instance. The threat model is written up in
[`SECURITY.md`](SECURITY.md).

## Accessibility

Clause cards are native `<details>` elements, so keyboard operation and screen-reader semantics are
the browser's rather than hand-rolled. Risk is always shown as a word — "High risk" — alongside its
colour, never colour alone. Streaming answers sit in an `aria-live` region, focus outlines are never
removed, and the interface respects `prefers-reduced-motion` and the system colour scheme.
