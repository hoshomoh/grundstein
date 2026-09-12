import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { StatFigure } from '@/components/ds'
import type { Money } from '@/domain/money'
import { formatEuros, formatEurosWithCents } from '@/lib/format'
import { cn } from '@/lib/utils'

export type SummaryBarProps = {
  monthlyPayment: Money
  cashNeeded: Money
  totalInterest: Money
}

/**
 * The three figures that follow the reader down the page.
 *
 * Sticky at the top, so the consequence of every slider is always in view. The loans
 * strip pins directly beneath it, which is what `--gs-barh` in index.css is measuring.
 */
export function SummaryBar({
  monthlyPayment,
  cashNeeded,
  totalInterest,
}: SummaryBarProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div id="summary-bar" className="bg-paper border-rule sticky top-0 z-40 border-t border-b">
      <div className="mx-auto grid max-w-(--container-page) grid-cols-3 gap-[clamp(10px,3vw,30px)] px-(--spacing-gutter) py-3.5">
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
