import type { ReactElement, RefCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { StatFigure } from '@/components/ds'
import type { Money } from '@/domain/money'
import { formatEuros, formatEurosWithCents } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Publishes this bar's height to `--gs-barh`, which the loans strip further down the
 * page uses as its sticky offset so it pins directly beneath the bar.
 *
 * The height cannot be written as a constant. The three figures sit on one row from
 * about 500px up, two below that, and each of the three text-size steps and both
 * languages move the wrap again. A hardcoded 80px was 40px short on a 402px phone,
 * which pinned the strip behind this bar and hid it completely.
 *
 * A ref callback rather than an effect: React runs it when the node attaches and runs
 * the cleanup when it leaves, which is exactly the lifetime of the measurement.
 * Declared at module scope so a re-render does not detach and re-attach it.
 */
const measureBar: RefCallback<HTMLElement> = (node) => {
  if (!node) return undefined

  const root = node.ownerDocument.documentElement
  const publish = (): void => {
    root.style.setProperty('--gs-barh', `${String(node.offsetHeight)}px`)
  }

  publish()
  const observer = new ResizeObserver(publish)
  observer.observe(node)

  return () => {
    observer.disconnect()
    // The stylesheet's own fallback beats a stale measurement of an element that has
    // left the page.
    root.style.removeProperty('--gs-barh')
  }
}

export type SummaryBarProps = {
  monthlyPayment: Money
  cashNeeded: Money
  totalInterest: Money
}

/**
 * The three figures that follow the reader down the page.
 *
 * Sticky at the top, so the consequence of every slider is always in view. It measures
 * itself into `--gs-barh` — see `measureBar` above.
 */
export function SummaryBar({
  monthlyPayment,
  cashNeeded,
  totalInterest,
}: SummaryBarProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div
      id="summary-bar"
      ref={measureBar}
      className="bg-paper border-rule sticky top-0 z-40 border-t border-b"
    >
      {/* Three fixed columns overflow at 360px once the reader steps the text up:
          each cell is ~100px and "1.548,10 €" at the largest size needs ~127px. Letting
          the columns wrap turns that into two rows rather than clipped figures. */}
      <div className="mx-auto grid max-w-(--container-page) grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-[clamp(10px,3vw,30px)] gap-y-2 px-(--spacing-gutter) py-3.5">
        <Figure label={t('summary.monthly')} accent>
          {formatEurosWithCents(monthlyPayment)}
        </Figure>
        <Figure label={t('summary.cash')}>{formatEuros(cashNeeded)}</Figure>
        <Figure label={t('summary.interest')}>{formatEuros(totalInterest)}</Figure>
      </div>
    </div>
  )
}

type FigureProps = {
  label: string
  children: string
  accent?: boolean
}

function Figure({ label, children, accent = false }: FigureProps): ReactElement {
  return (
    <div className="min-w-0">
      <div className="text-ink-3 text-label tracking-label mb-1.5 truncate font-mono uppercase">
        {label}
      </div>
      <div
        className={cn(
          'text-bar-figure tracking-figure font-mono',
          accent ? 'text-shu' : 'text-ink',
        )}
      >
        <StatFigure text={children} />
      </div>
    </div>
  )
}
