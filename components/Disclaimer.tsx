import { Scale } from 'lucide-react'

/**
 * The problem statement bounds this product to legal *information*, not advice.
 * That boundary is enforced in two places: here, where the reader can see it,
 * and in the system prompts, where the model is told to hold it.
 */
export function Disclaimer() {
  return (
    <aside
      className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted"
      aria-label="Scope of this tool"
    >
      <Scale className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium text-foreground">This is not legal advice.</span> ClauseLens
        explains what a document says and who it binds. It does not tell you what to do, and it is
        no substitute for a lawyer.
      </p>
    </aside>
  )
}
