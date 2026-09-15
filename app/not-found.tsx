import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">This analysis does not exist</h1>
      <p className="mt-2 text-muted">
        The link may be wrong, or the analysis was never saved. Upload a document to start a new
        one.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Analyse a document
      </Link>
    </div>
  )
}
