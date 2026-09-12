import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge, FieldLabel, RailSlider, RateInput, TextInput } from '@/components/ds'
import { checkEligibility, excludedProgrammes, incomeLimitFor } from '@/domain/eligibility'
import { euros, toNumber } from '@/domain/money'
import type { PortfolioRow } from '@/domain/portfolio'
import { maxLoanFor } from '@/domain/programmes'
import type { FollowupPeriod, Profile, Programme, ProgrammeKey, Tranche } from '@/domain/types'
import { formatEuros, formatEurosWithCents, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

import { reasonToText } from '../eligibility-copy'

const RATE_MAX = 10
const YEARS_MIN = 5
const GRACE_MAX = 5
const AMOUNT_STEP = 5_000

export type TrancheCardProps = {
  tranche: Tranche
  programme: Programme | undefined
  profile: Profile
  programmes: Readonly<Record<ProgrammeKey, Programme>>
  /** This tranche's share of the whole financing, for the band and the percentage. */
  share: number
  bandColour: string
  row: PortfolioRow | undefined
  inConflict: boolean
  onChange: (patch: Partial<Tranche>) => void
  onRemove: () => void
}

/** One loan in the stack: its figures, its conditions and what it costs a month. */
export function TrancheCard({
  tranche,
  programme,
  profile,
  programmes,
  share,
  bandColour,
  row,
  inConflict,
  onChange,
  onRemove,
}: TrancheCardProps): ReactElement {
  const { t } = useTranslation()

  const eligibility = programme
    ? checkEligibility(programme, profile)
    : { ok: true, reasons: [] as const }
  const ceiling = programme ? maxLoanFor(programme.ceiling, profile) : euros(0)
  const maxYears = programme?.maxYears ?? 35

  return (
    <div
      className={cn(
        'border-rule border-b py-6',
        inConflict && 'border-l-shu -ml-3 border-l-2 pl-3',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-(--gs-share-w) shrink-0 pt-0.75">
          <div
            className={cn(
              'tracking-figure font-mono text-lg whitespace-nowrap',
              tranche.amount.greaterThan(0) ? 'text-ink' : 'text-ink-3',
            )}
          >
            {formatPercent(share)}
          </div>
          <div
            aria-hidden
            className="mt-1.25 h-0.5 rounded-sm transition-[width] duration-500 ease-(--ease-gs)"
            style={{ width: `${String(Math.max(2, share))}%`, background: bandColour }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-4.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            <Badge tone={(programme?.isKfw ?? false) ? 'kfw' : 'bank'}>
              {(programme?.isKfw ?? false) ? 'KfW' : t('tranche.add')}
            </Badge>

            <TextInput
              label={t('library.name')}
              value={tranche.name}
              onCommit={(name) => {
                onChange({ name })
              }}
              className="flex-1 basis-48 text-xl"
            />

            {programme?.isKfw === true ? (
              <Badge
                tone={eligibility.ok ? 'ok' : 'warn'}
                outlined
                title={eligibility.reasons.map((reason) => reasonToText(reason, t)).join('; ')}
              >
                {eligibility.ok ? t('eligibility.eligible') : t('eligibility.checkIt')}
              </Badge>
            ) : null}

            <span className="text-ink-2 font-mono text-base tracking-[-0.02em] whitespace-nowrap">
              {formatEurosWithCents(row?.firstRepayment ?? euros(0))}
            </span>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`${t('tranche.remove')}: ${tranche.name}`}
              className={cn(
                'border-rule squircle text-ink-3 ml-auto flex size-8 shrink-0 items-center',
                'hover:border-shu hover:text-shu cursor-pointer justify-center rounded-md',
                'border bg-transparent transition-colors duration-300',
              )}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
              </svg>
            </button>
          </div>

          {/* Why, not just that. A badge saying "worth checking" with no reason leaves
              the reader to guess which of six rules they failed. */}
          {programme?.isKfw === true && !eligibility.ok ? (
            <p className="text-shu mb-4 text-xs">
              {eligibility.reasons.map((reason) => reasonToText(reason, t)).join(' · ')}
            </p>
          ) : null}

          {row?.subsidy.greaterThan(0) === true ? (
            <p className="text-moku mb-4 text-xs">
              {t('tranche.subsidyNote', {
                amount: formatEuros(row.subsidy),
                gross: formatEuros(row.amount),
                net: formatEuros(row.repayable),
              })}
            </p>
          ) : null}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-7.5 gap-y-1">
            <SliderRow
              label={t('tranche.amount')}
              reading={formatEuros(tranche.amount)}
              value={toNumber(tranche.amount)}
              min={0}
              max={Math.max(AMOUNT_STEP, toNumber(ceiling))}
              step={AMOUNT_STEP}
              valueText={`${formatEuros(tranche.amount)} ${t('requirements.maxLoan')} ${formatEuros(ceiling)}`}
              onChange={(value) => {
                onChange({ amount: euros(value) })
              }}
            />

            <SliderRow
              label={t('tranche.rate')}
              reading={formatPercent(tranche.ratePercent)}
              value={tranche.ratePercent}
              min={0}
              max={RATE_MAX}
              step={0.05}
              valueText={formatPercent(tranche.ratePercent)}
              onChange={(ratePercent) => {
                onChange({ ratePercent })
              }}
            />

            <SliderRow
              label={t('tranche.years')}
              reading={`${String(tranche.years)} ${t('tranche.yearAbbrev')}`}
              value={tranche.years}
              min={YEARS_MIN}
              max={maxYears}
              step={1}
              valueText={`${String(tranche.years)} ${t('tranche.yearsShort')}`}
              onChange={(years) => {
                onChange({ years })
              }}
            />

            <SliderRow
              label={t('tranche.grace')}
              reading={`${String(tranche.graceYears)} ${t('tranche.yearAbbrev')}`}
              value={tranche.graceYears}
              min={0}
              max={GRACE_MAX}
              step={1}
              valueText={`${String(tranche.graceYears)} ${t('tranche.yearsShort')}`}
              onChange={(graceYears) => {
                onChange({ graceYears })
              }}
            />
          </div>

          {tranche.years > (programme?.zinsbindungYears ?? 10) ? (
            <FollowupPeriods
              tranche={tranche}
              fixedYears={programme?.zinsbindungYears ?? 10}
              onChange={onChange}
            />
          ) : null}

          {programme ? (
            <Conditions programme={programme} profile={profile} programmes={programmes} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

type SliderRowProps = {
  label: string
  reading: string
  value: number
  min: number
  max: number
  step: number
  valueText: string
  onChange: (value: number) => void
}

function SliderRow({ label, reading, ...slider }: SliderRowProps): ReactElement {
  return (
    <div>
      <div className="flex min-h-(--gs-reading-h) flex-wrap items-baseline justify-between gap-x-2.5 gap-y-0.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="font-mono text-xs tracking-[-0.02em] whitespace-nowrap">{reading}</span>
      </div>
      <RailSlider label={label} {...slider} />
    </div>
  )
}

type FollowupPeriodsProps = {
  tranche: Tranche
  fixedYears: number
  onChange: (patch: Partial<Tranche>) => void
}

/** "After the fixed rate ends, assume N years at R%" — one row per period. */
function FollowupPeriods({ tranche, fixedYears, onChange }: FollowupPeriodsProps): ReactElement {
  const { t } = useTranslation()
  const periods = tranche.followupPeriods

  function replace(index: number, patch: Partial<FollowupPeriod>): void {
    onChange({
      followupPeriods: periods.map((period, at) =>
        at === index ? { ...period, ...patch } : period,
      ),
    })
  }

  /* Each period starts where the previous one ended. Accumulated up front rather than
   * mutated inside the map: the React Compiler memoises render output, and a variable
   * that changes as the list is walked is not something it can safely cache. */
  const startYears: number[] = []
  let cursor = fixedYears + 1
  for (const period of periods) {
    startYears.push(cursor)
    cursor += period.years
  }

  return (
    <div className="border-rule-2 mt-5 border-t pt-4">
      <FieldLabel className="mb-3.5">{t('tranche.afterFixed')}</FieldLabel>

      {periods.length === 0 ? (
        <p className="text-ink-3 mb-3.5 text-xs">{t('tranche.noFollowups')}</p>
      ) : null}

      {periods.map((period, index) => {
        const from = startYears[index] ?? fixedYears + 1

        return (
          <div
            key={`${String(index)}-${String(from)}`}
            className="text-ink-2 mb-3 flex flex-wrap items-baseline gap-2.5 text-xs"
          >
            <span className="text-ink min-w-26 font-mono">
              {t('tranche.fromYear')} {from}
            </span>

            <span className="inline-flex items-baseline gap-1.5">
              {t('tranche.for')}
              <RateInput
                label={`${t('tranche.for')} ${t('tranche.yearsShort')}`}
                value={period.years}
                max={40}
                onCommit={(years) => {
                  replace(index, { years })
                }}
                className="w-9.5"
              />
              {t('tranche.yearsShort')}
            </span>

            <span className="inline-flex items-baseline gap-1.5">
              {t('tranche.at')}
              <RateInput
                label={`${t('tranche.at')} %`}
                value={period.ratePercent}
                max={RATE_MAX}
                onCommit={(ratePercent) => {
                  replace(index, { ratePercent })
                }}
                className="w-9.5"
              />
              %
            </span>

            <button
              type="button"
              aria-label={t('tranche.removePeriod')}
              onClick={() => {
                onChange({ followupPeriods: periods.filter((_, at) => at !== index) })
              }}
              className="border-rule squircle text-ink-3 hover:border-shu hover:text-shu flex size-7 cursor-pointer items-center justify-center rounded-sm border bg-transparent transition-colors duration-300"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
              </svg>
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => {
          onChange({
            followupPeriods: [...periods, { years: 10, ratePercent: tranche.ratePercent }],
          })
        }}
        className={cn(
          'border-rule squircle text-ink-2 inline-flex min-h-9 items-center gap-1.75 rounded-md',
          'hover:border-ink hover:text-ink cursor-pointer border bg-transparent px-3.5 py-2',
          'text-label tracking-label font-mono uppercase transition-colors duration-300',
        )}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden
          className="shrink-0"
        >
          <path d="M12 5.2v13.6M5.2 12h13.6" />
        </svg>
        {t('tranche.addPeriod')}
      </button>
    </div>
  )
}

type ConditionsProps = {
  programme: Programme
  profile: Profile
  programmes: Readonly<Record<ProgrammeKey, Programme>>
}

/** The KfW conditions, folded away until asked for. */
function Conditions({ programme, profile, programmes }: ConditionsProps): ReactElement | null {
  const { t } = useTranslation()
  if (!programme.isKfw) return null

  const qualifiers: string[] = []
  if (programme.requiresChild) qualifiers.push(t('requirements.needsChild'))
  const limit = incomeLimitFor(programme, profile)
  if (limit) qualifiers.push(t('requirements.incomeUnder', { limit: formatEuros(limit) }))
  if (programme.excludesExistingOwners) qualifiers.push(t('requirements.noExistingHome'))
  if (programme.requiresGridFeed) qualifiers.push(t('requirements.gridFeed'))

  const excluded = excludedProgrammes(programme.key, programmes)
    .map((key) => programmes[key]?.short)
    .filter((short): short is string => short !== undefined)

  return (
    <details className="border-rule-2 mt-4.5 border-t pt-3.5">
      <summary className="text-ink-3 hover:text-shu text-label tracking-wide-label font-mono uppercase transition-colors duration-300">
        {t('requirements.title')}
      </summary>

      <dl className="text-ink-2 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-7.5 gap-y-1 pt-3.5 text-xs">
        <Condition label={t('requirements.maxLoan')}>
          {formatEuros(maxLoanFor(programme.ceiling, profile))}
        </Condition>
        <Condition label={t('requirements.qualifies')}>
          {qualifiers.length > 0 ? qualifiers.join('; ') : t('requirements.noTest')}
        </Condition>
        <Condition label={t('requirements.cannotCombine')}>
          {excluded.length > 0 ? excluded.join(', ') : t('requirements.noRestrictions')}
        </Condition>
        <Condition label={t('requirements.energy')}>
          {programme.energyTargets
            ? programme.energyTargets.map((target) => t(`profile.energyShort.${target}`)).join(', ')
            : t('requirements.noTest')}
        </Condition>

        {/* Where a figure came from, and when it was last checked. A ceiling with no
            provenance is a rumour (STANDARDS.md §4). */}
        {programme.provenance.note ? (
          <Condition label={t('requirements.note')}>{programme.provenance.note}</Condition>
        ) : null}

        {/* KfW publishes no rates at all — every product page renders its rate table
            as "-,-- %". Saying so is the difference between a starting point and a
            quoted figure, and the reader is about to plan around it. */}
        <p className="text-ink-3 col-span-full m-0">{t('provenance.rateIsAStartingPoint')}</p>

        <div className="col-span-full">
          {programme.provenance.source ? (
            <a href={programme.provenance.source} target="_blank" rel="noopener noreferrer">
              {t('requirements.official')} ↗
            </a>
          ) : (
            <span className="text-ink-3">{t('provenance.unverified')}</span>
          )}
        </div>
      </dl>
    </details>
  )
}

type ConditionProps = {
  label: string
  children: ReactNode
}

function Condition({ label, children }: ConditionProps): ReactElement {
  return (
    <div>
      <dt className="text-ink-3 inline">{label} </dt>
      <dd className="m-0 inline">{children}</dd>
    </div>
  )
}
