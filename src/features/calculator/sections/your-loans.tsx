import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Callout, StackBar, type StackSegment } from '@/components/ds'
import { checkEligibility, type Conflict } from '@/domain/eligibility'
import { type Money, sum } from '@/domain/money'
import type { Cover, PortfolioRow } from '@/domain/portfolio'
import type { Profile, Programme, ProgrammeKey, Tranche } from '@/domain/types'
import { formatEuros, formatPercent, percentWidth, shareOf } from '@/lib/format'
import { cn } from '@/lib/utils'

import { SectionHeading } from './section-heading'
import { TrancheCard } from './tranche-card'

/** One band per tranche, cycling if someone adds more than eight loans. */
const BAND_COUNT = 8

export type YourLoansProps = {
  tranches: readonly Tranche[]
  programmes: Readonly<Record<ProgrammeKey, Programme>>
  programmeOrder: readonly ProgrammeKey[]
  profile: Profile
  rows: readonly PortfolioRow[]
  down: Money
  cover: Cover
  conflicts: readonly Conflict[]
  conflictedTrancheIds: ReadonlySet<number>
  onTrancheChange: (id: number, patch: Partial<Tranche>) => void
  onTrancheRemove: (id: number) => void
  onTrancheAdd: (key: ProgrammeKey) => void
  onReset: () => void
}

/** Section 003: the stack of loans, and whether it adds up. */
export function YourLoans({
  tranches,
  programmes,
  programmeOrder,
  profile,
  rows,
  down,
  cover,
  conflicts,
  conflictedTrancheIds,
  onTrancheChange,
  onTrancheRemove,
  onTrancheAdd,
  onReset,
}: YourLoansProps): ReactElement {
  const { t } = useTranslation()

  const borrowed = sum(tranches.map((tranche) => tranche.amount))
  /* The buyer's own money is part of the capital structure: showing only the loans
   * would make a heavily-deposited purchase look entirely debt-funded. */
  const financed = borrowed.plus(down)

  const segments: StackSegment[] = tranches
    .filter((tranche) => tranche.amount.greaterThan(0))
    .map((tranche, index) => ({
      id: String(tranche.id),
      width: percentWidth(tranche.amount, financed),
      colour: `var(--band-${String((index % BAND_COUNT) + 1)})`,
      label: `${programmes[tranche.programmeKey]?.short ?? tranche.name} · ${formatPercent(shareOf(tranche.amount, financed))}`,
      title: `${tranche.name}, ${formatEuros(tranche.amount)}`,
    }))

  if (down.greaterThan(0)) {
    segments.push({
      id: 'equity',
      width: percentWidth(down, financed),
      colour: 'var(--ink-3)',
      label: `${t('structure.equity')} · ${formatPercent(shareOf(down, financed))}`,
      title: `${t('structure.equity')}, ${formatEuros(down)}`,
    })
  }

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section)">
      <SectionHeading number="003">{t('sections.tranches')}</SectionHeading>

      {/* Pinned under the summary bar, so the shape of the financing and whether it
          covers the purchase stay visible while the sliders move. */}
      <div className="bg-paper border-rule-2 sticky top-(--gs-barh) z-30 mb-[clamp(26px,4vw,42px)] border-b py-3">
        <StackBar segments={segments} label={t('sections.tranches')} />
        <p
          className={cn(
            'text-label mt-1.5 text-right font-mono tracking-[0.08em] whitespace-nowrap',
            cover.status === 'covered' && 'text-moku',
            cover.status === 'over' && 'text-ink-3',
            cover.status === 'short' && 'text-shu',
          )}
        >
          {cover.status === 'covered'
            ? `${t('structure.covered')} · ${formatEuros(borrowed)}`
            : t(`structure.${cover.status}`, { amount: formatEuros(cover.difference) })}
        </p>
      </div>

      {conflicts.length > 0 ? (
        <Callout title={t('conflict.title')} className="mb-6">
          {conflicts.map((conflict) => (
            <div key={`${conflict.a}|${conflict.b}`}>
              {t('conflict.pair', {
                first: programmes[conflict.a]?.short ?? conflict.a,
                second: programmes[conflict.b]?.short ?? conflict.b,
              })}
            </div>
          ))}
        </Callout>
      ) : null}

      <div className="border-rule border-t">
        {tranches.map((tranche, index) => (
          <TrancheCard
            key={tranche.id}
            tranche={tranche}
            programme={programmes[tranche.programmeKey]}
            programmes={programmes}
            profile={profile}
            share={shareOf(tranche.amount, financed)}
            bandColour={`var(--band-${String((index % BAND_COUNT) + 1)})`}
            row={rows.find((row) => row.trancheId === tranche.id)}
            inConflict={conflictedTrancheIds.has(tranche.id)}
            onChange={(patch) => {
              onTrancheChange(tranche.id, patch)
            }}
            onRemove={() => {
              onTrancheRemove(tranche.id)
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-6">
        <span className="text-ink-3 text-label tracking-label mr-2 font-mono uppercase">
          {t('tranche.add')}
        </span>

        {programmeOrder.map((key) => {
          const programme = programmes[key]
          if (!programme) return null

          const eligible = !programme.isKfw || checkEligibility(programme, profile).ok

          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onTrancheAdd(key)
              }}
              className={cn(
                'border-rule squircle text-ink-2 min-h-10 rounded-lg border px-3.5 py-2.25',
                'hover:border-ink hover:text-ink cursor-pointer bg-transparent',
                'text-label font-mono tracking-[0.08em] transition-colors duration-300',
                // Dashed rather than hidden: a loan the household does not qualify for
                // today may be one they qualify for after changing an answer.
                eligible ? 'border-solid' : 'border-dashed',
              )}
            >
              {programme.short}
            </button>
          )
        })}

        <button
          type="button"
          onClick={onReset}
          className={cn(
            'border-rule text-ink-3 hover:border-shu hover:text-shu ml-auto cursor-pointer',
            'border-0 border-b bg-transparent py-1.75',
            'text-label tracking-wide-label font-mono uppercase transition-colors duration-300',
          )}
        >
          {t('tranche.reset')}
        </button>
      </div>
    </section>
  )
}
