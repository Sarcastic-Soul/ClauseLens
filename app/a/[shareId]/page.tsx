import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AnalysisView } from '@/components/AnalysisView'
import { Disclaimer } from '@/components/Disclaimer'
import { loadAnalysis } from '@/lib/analysis-store'
import { shareIdSchema } from '@/lib/schema'

/**
 * A share link is unguessable, and that is the only thing keeping a saved
 * analysis private. Indexing one would undo that the moment a visitor pasted
 * the link somewhere a crawler can reach.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

/** A saved analysis, opened without re-uploading the document. */
export default async function SharedAnalysisPage({ params }: PageProps<'/a/[shareId]'>) {
  const { shareId } = await params
  const parsed = shareIdSchema.safeParse(shareId)
  if (!parsed.success) notFound()

  const analysis = await loadAnalysis(parsed.data)
  if (!analysis) notFound()

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <header>
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ClauseLens
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{analysis.fileName}</h1>
        <p className="mt-1 text-sm text-muted">A saved analysis. The original file was not kept.</p>
      </header>

      <div className="mt-8">
        <Disclaimer />
      </div>

      <main id="main-content" className="mt-10 border-t border-border pt-8">
        <AnalysisView analysis={analysis} shareId={analysis.shareId} />
      </main>
    </div>
  )
}
