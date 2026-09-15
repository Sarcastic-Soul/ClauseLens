'use client'

import { useId, useState } from 'react'

import { sendFeedback } from '@/lib/api-client'

const RATINGS = [1, 2, 3, 4, 5]

/** This edition of the challenge is a pilot, so feedback is part of the product. */
export function FeedbackWidget() {
  const commentId = useId()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (rating === null) return

    setState('sending')
    try {
      await sendFeedback({ rating, comment: comment.trim() || undefined })
      setState('sent')
    } catch {
      setState('failed')
    }
  }

  if (state === 'sent') {
    return <p className="text-sm text-muted">Thanks — that is recorded.</p>
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset>
        <legend className="text-sm font-medium">Was this useful?</legend>
        <div className="mt-2 flex gap-1.5">
          {RATINGS.map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                rating === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border bg-surface hover:border-accent'
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
              />
              {value}
            </label>
          ))}
          <span className="self-center pl-2 text-xs text-muted">1 = not useful, 5 = very</span>
        </div>
      </fieldset>

      <div>
        <label htmlFor={commentId} className="text-sm text-muted">
          Anything to add? (optional)
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted"
        />
      </div>

      <button
        type="submit"
        disabled={rating === null || state === 'sending'}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'sending' ? 'Sending…' : 'Send feedback'}
      </button>

      {state === 'failed' && (
        <p role="alert" className="text-sm text-risk-high">
          That could not be sent. It is not important enough to retry — carry on.
        </p>
      )}
    </form>
  )
}
