import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Callout, ConfirmDialog, StackBar, type StackSegment } from '@/components/ds'
import { checkEligibility, type Conflict } from '@/domain/eligibility'
import type { Money } from '@/domain/money'
import type { Cover, PortfolioRow } from '@/domain/portfolio'
import type { Profile, Programme, ProgrammeKey, Tranche } from '@/domain/types'
import { matchesSuggestion, type Suggestion } from '@/domain/suggestion'
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
  /** The portfolio's own total. Not recomputed here: one total, one definition. */
  borrowed: Money
  down: Money
  cover: Cover
  conflicts: readonly Conflict[]
  conflictedTrancheIds: ReadonlySet<number>
  onTrancheChange: (id: number, patch: Partial<Tranche>) => void
  onTrancheRemove: (id: number) => void
  onTrancheAdd: (key: ProgrammeKey) => void
  onReset: () => void
  /** A package for the answers as they stand, offered when it is not already in place. */
  suggestion: Suggestion
  onApplySuggestion: () => void
}

/** Section 003: the stack of loans, and whether it adds up. */
export function YourLoans({
  tranches,
  programmes,
  programmeOrder,
  profile,
  rows,
  borrowed,
  down,
  cover,
  conflicts,
  conflictedTrancheIds,
  onTrancheChange,
  onTrancheRemove,
  onTrancheAdd,
  onReset,
  suggestion,
  onApplySuggestion,
}: YourLoansProps): ReactElement {
  const { t } = useTranslation()

  /* The buyer's own money is part of the capital structure: showing only the loans
   * would make a heavily-deposited purchase look entirely debt-funded. */
  const financed = borrowed.plus(down)

  /* Built from the rows, not the tranches: a loan held down to the household's ceiling
   * is borrowing the lower figure, and a bar drawn from the asked-for one would
   * disagree with the cover line beneath it. `rows` already leaves out anything funding
   * nothing, which is what the old `.filter()` was for. */
  const segments: StackSegment[] = rows.map((row, index) => ({
    id: String(row.trancheId),
    width: percentWidth(row.amount, financed),
    colour: `var(--band-${String((index % BAND_COUNT) + 1)})`,
    label: `${programmes[row.programmeKey]?.short ?? row.name} · ${formatPercent(shareOf(row.amount, financed))}`,
    title: `${row.name}, ${formatEuros(row.amount)}`,
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
        <Callout
          title={t('conflict.title')}
          className={cn(
            'mb-6 translate-y-0 opacity-100',
            'transition-[opacity,transform] duration-[180ms] ease-(--ease-gs)',
            'starting:-translate-y-1 starting:opacity-0',
          )}
        >
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

      <SuggestedPackage
        suggestion={suggestion}
        tranches={tranches}
        programmes={programmes}
        onApply={onApplySuggestion}
      />

      <div className="border-rule border-t">
        {tranches.map((tranche, index) => (
          <div
            key={tranche.id}
            className={cn(
              'translate-y-0 opacity-100',
              'transition-[opacity,transform] duration-[220ms] ease-(--ease-gs)',
              'starting:translate-y-2 starting:opacity-0',
            )}
          >
            <TrancheCard
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
          </div>
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
                'text-label font-mono tracking-[0.08em] transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]',
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
            'text-label tracking-wide-label font-mono uppercase transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]',
          )}
        >
          {t('tranche.reset')}
        </button>
      </div>
    </section>
  )
}

type SuggestedPackageProps = {
  suggestion: Suggestion
  tranches: readonly Tranche[]
  programmes: Readonly<Record<ProgrammeKey, Programme>>
  onApply: () => void
}

/**
 * The arrangement of borrowing these answers point at, offered rather than imposed.
 *
 * Above the loans rather than below them. Someone who has already scrolled through
 * eight sliders tuning a loan does not want to be told afterwards that a different
 * arrangement was available — the alternative is worth seeing before the work, not
 * after it.
 *
 * It appears only when it would change something: once the package is in place the
 * panel goes, because an offer to apply what is already applied is noise and a button
 * that does nothing teaches people to ignore buttons.
 *
 * Applying replaces every loan on the page, so it asks first — the same courtesy the
 * catalogue extends before deleting a programme.
 */
function SuggestedPackage({
  suggestion,
  tranches,
  programmes,
  onApply,
}: SuggestedPackageProps): ReactElement | null {
  const { t } = useTranslation()

  if (suggestion.tranches.length === 0) return null
  if (matchesSuggestion(tranches, suggestion)) return null

  return (
    <div className="border-rule-2 squircle mb-[clamp(26px,4vw,42px)] rounded-xl border border-dashed p-[clamp(18px,3vw,26px)]">
      <p className="text-ink-3 text-label tracking-label mb-4 font-mono uppercase">
        {t('suggestion.title')}
      </p>

      <ul className="m-0 flex list-none flex-wrap gap-x-7.5 gap-y-2 p-0">
        {suggestion.tranches.map((suggested) => (
          <li key={suggested.programmeKey} className="text-ink flex items-baseline gap-2.5 text-sm">
            <span className="text-ink-3 text-label tracking-label font-mono uppercase">
              {programmes[suggested.programmeKey]?.short ?? suggested.programmeKey}
            </span>
            <span className="font-mono tracking-[-0.02em]">{formatEuros(suggested.amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-ink-2 m-0 max-w-[52ch] text-xs">
          {suggestion.shortfall.greaterThan(0)
            ? t('suggestion.short', {
                funded: formatEuros(suggestion.funded),
                shortfall: formatEuros(suggestion.shortfall),
              })
            : t('suggestion.covers', { needed: formatEuros(suggestion.needed) })}
        </p>

        <ConfirmDialog
          title={t('suggestion.confirmTitle')}
          body={t('suggestion.confirmBody')}
          confirmLabel={t('suggestion.apply')}
          onConfirm={onApply}
        >
          <button
            type="button"
            className={cn(
              'border-shu text-shu squircle hover:bg-shu-soft min-h-10.5 shrink-0 cursor-pointer',
              'rounded-lg border bg-transparent px-4 py-2.5',
              'text-label tracking-label font-mono uppercase',
              'transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]',
            )}
          >
            {t('suggestion.apply')}
          </button>
        </ConfirmDialog>
      </div>
    </div>
  )
}
