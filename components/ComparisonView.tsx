import type { Comparison, Favours } from '@/lib/schema'
import { cn } from '@/lib/utils'

/**
 * A difference is only useful if the reader can see which side it helps, so
 * every row is labelled in words as well as position. Colour is never the only
 * signal here, same rule as the risk badges.
 */
function FavoursBadge({
  favours,
  names,
}: {
  favours: Favours
  names: { first: string; second: string }
}) {
  const LABEL: Record<Favours, string> = {
    first: `Better in ${names.first}`,
    second: `Better in ${names.second}`,
    neither: 'Neither is better',
  }

  const STYLE: Record<Favours, string> = {
    first: 'bg-accent-soft text-accent border-accent/30',
    second: 'bg-accent-soft text-accent border-accent/30',
    neither: 'bg-risk-low-soft text-risk-low border-risk-low/30',
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLE[favours],
      )}
    >
      {LABEL[favours]}
    </span>
  )
}

export function ComparisonView({
  comparison,
  fileNames,
}: {
  comparison: Comparison
  fileNames: { first: string; second: string }
}) {
  const labels = {
    first: shorten(fileNames.first),
    second: shorten(fileNames.second),
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="comparison-heading">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {comparison.docTypeFirst} vs {comparison.docTypeSecond}
        </p>
        <h2 id="comparison-heading" className="mt-1 text-lg font-medium">
          {comparison.comparable ? 'What differs' : 'These are not comparable'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{comparison.summary}</p>
      </section>

      {comparison.differences.length === 0 ? (
        <p className="text-sm text-muted">
          No differences were extracted. Upload two documents of the same kind — two rent
          agreements, or two versions of one offer letter — to see them compared.
        </p>
      ) : (
        <section aria-labelledby="differences-heading">
          <h3 id="differences-heading" className="sr-only">
            Differences, in order of what is at stake
          </h3>
          <ol className="space-y-3">
            {comparison.differences.map((difference, index) => (
              <li
                key={`${difference.topic}-${index}`}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-medium">{difference.topic}</h4>
                  <FavoursBadge favours={difference.favours} names={labels} />
                </div>

                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {labels.first}
                    </dt>
                    <dd className="mt-1 text-sm">{difference.inFirst}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {labels.second}
                    </dt>
                    <dd className="mt-1 text-sm">{difference.inSecond}</dd>
                  </div>
                </dl>

                <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
                  {difference.why}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

/** File names are shown as column headings, so a long one has to be cut. */
function shorten(fileName: string): string {
  const withoutExtension = fileName.replace(/\.pdf$/i, '')
  return withoutExtension.length > 28 ? `${withoutExtension.slice(0, 27)}…` : withoutExtension
}
