import type { RiskLevel } from '@/lib/schema'
import { cn } from '@/lib/utils'

const LABELS: Record<RiskLevel, string> = {
  high: 'High risk',
  medium: 'Medium risk',
  low: 'Low risk',
}

const STYLES: Record<RiskLevel, string> = {
  high: 'bg-risk-high-soft text-risk-high border-risk-high/30',
  medium: 'bg-risk-medium-soft text-risk-medium border-risk-medium/30',
  low: 'bg-risk-low-soft text-risk-low border-risk-low/30',
}

/**
 * Risk is always shown as a word, not only as a colour. Colour-blind readers
 * and anyone on a monochrome display get the same information.
 */
export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STYLES[risk],
        className,
      )}
    >
      {LABELS[risk]}
    </span>
  )
}
