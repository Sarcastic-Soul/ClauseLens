'use client'

import { FileText, Loader2, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { MAX_UPLOAD_BYTES } from '@/lib/upload'

const SAMPLES = [
  { file: 'residential-rent-agreement.pdf', label: 'Rent agreement' },
  { file: 'employment-offer-letter.pdf', label: 'Offer letter' },
  { file: 'freelance-services-agreement.pdf', label: 'Contractor agreement' },
  { file: 'not-a-contract-recipe.pdf', label: 'A recipe (not a contract)' },
]

const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))

/**
 * Size and type are checked here as well as on the server. The client check is
 * for the reader's sake — an immediate, specific message instead of a round
 * trip — and the server check is the one that actually guards the endpoint.
 */
export function UploadPane({ onSelect, busy }: { onSelect: (file: File) => void; busy: boolean }) {
  const inputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)
  const [loadingSample, setLoadingSample] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setLocalError(null)

    if (file.size === 0) {
      setLocalError('That file is empty. Choose a PDF with content in it.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setLocalError(`That file is ${formatMb(file.size)} MB. The limit is ${MAX_MB} MB.`)
      return
    }
    if (file.type && file.type !== 'application/pdf') {
      setLocalError('Only PDF documents can be analysed.')
      return
    }

    onSelect(file)
  }

  async function handleSample(fileName: string) {
    setLocalError(null)
    setLoadingSample(fileName)
    try {
      const response = await fetch(`/samples/${fileName}`)
      if (!response.ok) throw new Error(`Sample fetch failed: ${response.status}`)
      const blob = await response.blob()
      onSelect(new File([blob], fileName, { type: 'application/pdf' }))
    } catch {
      setLocalError('That sample could not be loaded. Try uploading a file instead.')
    } finally {
      setLoadingSample(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
        <Upload className="mx-auto size-6 text-muted" aria-hidden="true" />
        <label htmlFor={inputId} className="mt-3 block font-medium">
          Upload a contract
        </label>
        <p className="mt-1 text-sm text-muted">PDF, up to {MAX_MB} MB. Nothing is stored.</p>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          className="mt-4 block w-full cursor-pointer text-sm text-muted file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-foreground disabled:cursor-not-allowed"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleFile(file)
            event.target.value = ''
          }}
        />
      </div>

      <div>
        <p className="text-sm text-muted">Or try one of these:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <li key={sample.file}>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSample(sample.file)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingSample === sample.file ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="size-3.5" aria-hidden="true" />
                )}
                {sample.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {localError && (
        <p role="alert" className="text-sm text-risk-high">
          {localError}
        </p>
      )}
    </div>
  )
}

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}
