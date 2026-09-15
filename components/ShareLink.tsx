'use client'

import { Check, Link2 } from 'lucide-react'
import { useState } from 'react'

/** Share links let the analysis be reopened without re-uploading the document. */
export function ShareLink({ shareId }: { shareId: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/a/${shareId}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      <Link2 className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <a href={`/a/${shareId}`} className="flex-1 truncate text-muted hover:text-accent">
        /a/{shareId}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Link2 className="size-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
