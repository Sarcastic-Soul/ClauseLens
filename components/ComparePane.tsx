'use client'

import { FileText, Upload } from 'lucide-react'
import { useId, useState } from 'react'

import { MAX_COMPARE_UPLOAD_BYTES } from '@/lib/upload'

const MAX_MB = Math.round(MAX_COMPARE_UPLOAD_BYTES / (1024 * 1024))

const SAMPLE_PAIRS = [
  {
    label: 'Two rent agreements',
    first: 'residential-rent-agreement.pdf',
    second: 'residential-rent-agreement-fair.pdf',
  },
  {
    label: 'Offer letter vs contractor agreement',
    first: 'employment-offer-letter.pdf',
    second: 'freelance-services-agreement.pdf',
  },
]

/**
 * Two pickers rather than one multi-select, because the order matters: every
 * difference is reported as first-versus-second, and the reader needs to know
 * which is which before they choose.
 */
export function ComparePane({
  onCompare,
  busy,
}: {
  onCompare: (first: File, second: File) => void
  busy: boolean
}) {
  const firstId = useId()
  const secondId = useId()
  const [first, setFirst] = useState<File | null>(null)
  const [second, setSecond] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function accept(file: File, set: (file: File | null) => void) {
    setError(null)

    if (file.size === 0) {
      setError('That file is empty. Choose a PDF with content in it.')
      return
    }
    if (file.size > MAX_COMPARE_UPLOAD_BYTES) {
      setError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Each document must be under ${MAX_MB} MB when comparing two.`,
      )
      return
    }
    if (file.type && file.type !== 'application/pdf') {
      setError('Only PDF documents can be compared.')
      return
    }

    set(file)
  }

  async function loadSamplePair(pair: (typeof SAMPLE_PAIRS)[number]) {
    setError(null)
    try {
      const [a, b] = await Promise.all([fetchSample(pair.first), fetchSample(pair.second)])
      setFirst(a)
      setSecond(b)
      onCompare(a, b)
    } catch {
      setError('Those samples could not be loaded. Try uploading files instead.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FilePicker
          id={firstId}
          label="First document"
          file={first}
          busy={busy}
          onPick={(file) => accept(file, setFirst)}
        />
        <FilePicker
          id={secondId}
          label="Second document"
          file={second}
          busy={busy}
          onPick={(file) => accept(file, setSecond)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !first || !second}
          onClick={() => first && second && onCompare(first, second)}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden="true" />
          Compare these two
        </button>
        <p className="text-sm text-muted">PDF, up to {MAX_MB} MB each. Neither file is stored.</p>
      </div>

      <div>
        <p className="text-sm text-muted">Or try a pair:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_PAIRS.map((pair) => (
            <li key={pair.label}>
              <button
                type="button"
                disabled={busy}
                onClick={() => loadSamplePair(pair)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                {pair.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-sm text-risk-high">
          {error}
        </p>
      )}
    </div>
  )
}

function FilePicker({
  id,
  label,
  file,
  busy,
  onPick,
}: {
  id: string
  label: string
  file: File | null
  busy: boolean
  onPick: (file: File) => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-4">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        disabled={busy}
        className="mt-2 block w-full cursor-pointer text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground disabled:cursor-not-allowed"
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (picked) onPick(picked)
          event.target.value = ''
        }}
      />
      <p className="mt-2 truncate text-xs text-muted">{file ? file.name : 'Nothing chosen yet'}</p>
    </div>
  )
}

async function fetchSample(fileName: string): Promise<File> {
  const response = await fetch(`/samples/${fileName}`)
  if (!response.ok) throw new Error(`Sample fetch failed: ${response.status}`)
  return new File([await response.blob()], fileName, { type: 'application/pdf' })
}
