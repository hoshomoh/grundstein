import { useState, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { euros, max, type Money, toNumber } from '@/domain/money'
import { monthsOfYear, type Portfolio } from '@/domain/portfolio'
import { formatEuros, formatEurosWithCents } from '@/lib/format'
import { cn } from '@/lib/utils'

import { SectionHeading } from './section-heading'

/* Two series: what comes off the loan, and what it costs to borrow it. Validated with
 * the dataviz palette checker against both surfaces:
 *
 *   light  interest #a83a28 vs repayment #9a9996 on #fbfaf7 — CVD ΔE 18.8, normal 23.1
 *   dark   interest #e2694c vs repayment #6c6c67 on #0d0d0b — CVD ΔE  8.8, normal 20.4
 *
 * Both clear the ΔE 8 separation target. The repayment neutral fails the chroma floor
 * by design: it is the ground of the bar — the money you borrowed — rather than a peer
 * category, and the accent is reserved for the thing the page is about. The checker
 * also warns that the light neutral sits at 2.73:1 against paper, which is not
 * dismissable, so the figures are also published as a table below the chart.
 *
 * Secondary encoding beyond colour: a legend, a 2px gap between the two segments, and
 * a text readout naming both figures. */
const FIXED_RATE_YEARS = 10

export type YearByYearProps = {
  portfolio: Portfolio
}

/** Section 004: where the money goes, year by year, and what year ten does to it. */
export function YearByYear({ portfolio }: YearByYearProps): ReactElement {
  const { t } = useTranslation()
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const years = portfolio.yearly
  /** Where the fixed-rate marker stands, as a fraction of the chart's width. */
  const markerShare = years.length === 0 ? 0 : FIXED_RATE_YEARS / years.length
  const tallest = years.reduce<Money>(
    (highest, year) => max(highest, year.principal.plus(year.interest)),
    euros(1),
  )

  const selected = selectedYear === null ? undefined : years[selectedYear]

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section)">
      <SectionHeading
        number="004"
        trailing={
          <div className="text-ink-3 text-label tracking-label flex gap-4.5 font-mono uppercase">
            <LegendKey colour="var(--ink)" faded>
              {t('chart.principal')}
            </LegendKey>
            <LegendKey colour="var(--shu)">{t('chart.interest')}</LegendKey>
          </div>
        }
      >
        {t('sections.course')}
      </SectionHeading>

      {years.length === 0 ? (
        <p className="text-ink-3 text-sm">{t('tranche.noFollowups')}</p>
      ) : (
        <>
          <div className="border-rule relative flex h-[clamp(180px,30vw,280px)] items-end gap-0.75 border-b">
            {years.map((year, index) => {
              const total = year.principal.plus(year.interest)
              const heightPercent = (toNumber(total) / toNumber(tallest)) * 100
              const interestShare = total.isZero()
                ? 0
                : (toNumber(year.interest) / toNumber(total)) * 100

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSelectedYear(index === selectedYear ? null : index)
                  }}
                  onMouseEnter={() => {
                    setSelectedYear(index)
                  }}
                  aria-pressed={index === selectedYear}
                  aria-label={t('chart.yearReadout', {
                    year: index + 1,
                    interest: formatEuros(year.interest),
                    principal: formatEuros(year.principal),
                    total: formatEuros(total),
                  })}
                  className={cn(
                    'flex h-full min-w-0 flex-1 cursor-crosshair items-end border-0 p-0',
                    'transition-colors duration-150',
                    index === selectedYear ? 'bg-shu-soft' : 'bg-transparent',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-full w-full origin-bottom flex-col overflow-hidden rounded-t transition-transform duration-500 ease-(--ease-gs)"
                    style={{ transform: `scaleY(${(heightPercent / 100).toFixed(4)})` }}
                  >
                    {/* A 2px surface gap keeps the two segments legible where they
                        meet, which is where a stacked bar is hardest to read. */}
                    <span
                      className="bg-shu block border-b-2 border-(--paper)"
                      style={{ height: `${interestShare.toFixed(2)}%` }}
                    />
                    <span className="bg-ink block flex-1 opacity-42" />
                  </span>
                </button>
              )
            })}

            {years.length > FIXED_RATE_YEARS ? (
              <div
                aria-hidden
                className="border-shu pointer-events-none absolute top-0 bottom-0 w-0 border-l border-dashed"
                style={{ left: `${(markerShare * 100).toFixed(2)}%` }}
              >
                {/* The label hangs off a line that can stand anywhere across the chart,
                    and it cannot wrap. On a phone it is most of the chart's width, so
                    past halfway it goes on the left of the line — otherwise a loan that
                    runs barely longer than its fixed rate pushes the label, and the
                    page, past the edge of the screen. */}
                <span
                  className={cn(
                    'text-shu text-label absolute top-0 font-mono tracking-[0.08em] whitespace-nowrap uppercase',
                    markerShare > 0.5 ? 'right-1.75 text-right' : 'left-1.75',
                  )}
                >
                  {t('chart.fixedEnds')}
                </span>
              </div>
            ) : null}
          </div>

          <div aria-hidden className="mt-2 flex gap-0.75">
            {years.map((_, index) => (
              <div
                key={index}
                className="text-ink-3 text-label min-w-0 flex-1 overflow-hidden text-center font-mono"
              >
                {index === 0 || (index + 1) % 5 === 0 || index === years.length - 1
                  ? index + 1
                  : ''}
              </div>
            ))}
          </div>

          {/* The accessible path to the same data, and the relief the contrast check
              requires. Announced politely: it changes as the reader sweeps the bars. */}
          <p
            aria-live="polite"
            className="border-rule-2 text-ink-2 mt-6 min-h-14 border-t pt-4.5 text-xs"
          >
            {selected && selectedYear !== null
              ? t('chart.yearReadout', {
                  year: selectedYear + 1,
                  interest: formatEurosWithCents(selected.interest),
                  principal: formatEurosWithCents(selected.principal),
                  total: formatEurosWithCents(selected.principal.plus(selected.interest)),
                })
              : `${t('chart.hint')} ${t('chart.mostExpensive', { amount: formatEuros(tallest) })}`}
          </p>

          {selectedYear !== null ? <MonthDetail portfolio={portfolio} year={selectedYear} /> : null}

          <button
            type="button"
            onClick={() => {
              setShowTable(!showTable)
            }}
            aria-expanded={showTable}
            className="border-rule text-ink-3 hover:border-shu hover:text-shu text-label tracking-wide-label mt-4 cursor-pointer border-0 border-b bg-transparent py-1.5 font-mono uppercase transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]"
          >
            {showTable ? t('chart.hideTable') : t('chart.showTable')}
          </button>

          {showTable ? <YearTable portfolio={portfolio} /> : null}
        </>
      )}
    </section>
  )
}

type LegendKeyProps = {
  colour: string
  faded?: boolean
  children: string
}

function LegendKey({ colour, faded = false, children }: LegendKeyProps): ReactElement {
  return (
    <span className="inline-flex items-center gap-1.75">
      <span
        aria-hidden
        className={cn('h-0.5 w-3.5 rounded-sm', faded && 'opacity-42')}
        style={{ background: colour }}
      />
      {children}
    </span>
  )
}

type MonthDetailProps = {
  portfolio: Portfolio
  year: number
}

/** The twelve months of the chosen year, for readers who want the detail. */
function MonthDetail({ portfolio, year }: MonthDetailProps): ReactElement {
  const { t } = useTranslation()
  const months = monthsOfYear(portfolio.months, year)

  const tallest = months.reduce<Money>(
    (highest, month) => max(highest, month.principal.plus(month.interest)),
    euros(1),
  )

  return (
    <div
      className={cn(
        'mt-6.5 translate-y-0 opacity-100',
        'transition-[opacity,transform] duration-200 ease-(--ease-gs)',
        'starting:translate-y-2 starting:opacity-0',
      )}
    >
      <p className="text-ink-3 text-label tracking-label mb-4.5 font-mono uppercase">
        {t('chart.monthTitle', { year: year + 1 })}
      </p>

      <div aria-hidden className="border-rule flex h-30 items-end gap-1.5 border-b">
        {months.map((month, index) => {
          const total = month.principal.plus(month.interest)
          const heightPercent = (toNumber(total) / toNumber(tallest)) * 100
          const interestShare = total.isZero()
            ? 0
            : (toNumber(month.interest) / toNumber(total)) * 100

          return (
            <div key={index} className="flex h-full min-w-0 flex-1 items-end">
              <span
                className="flex w-full flex-col overflow-hidden rounded-t"
                style={{ height: `${heightPercent.toFixed(2)}%` }}
              >
                <span
                  className="bg-shu block border-b-2 border-(--paper)"
                  style={{ height: `${interestShare.toFixed(2)}%` }}
                />
                <span className="bg-ink block flex-1 opacity-42" />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type YearTableProps = {
  portfolio: Portfolio
}

/** Every figure in the chart, as a table. */
function YearTable({ portfolio }: YearTableProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{t('chart.tableLabel')}</caption>
        <thead>
          <tr className="border-rule text-ink-3 text-label border-b text-left font-mono uppercase">
            <th scope="col" className="py-2 font-normal">
              {t('tranche.years')}
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              {t('chart.principal')}
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              {t('chart.interest')}
            </th>
          </tr>
        </thead>
        <tbody>
          {portfolio.yearly.map((year, index) => (
            <tr key={index} className="border-rule-2 border-b">
              <th scope="row" className="py-1.5 text-left font-normal">
                {index + 1}
              </th>
              <td className="py-1.5 text-right font-mono">{formatEuros(year.principal)}</td>
              <td className="text-shu py-1.5 text-right font-mono">{formatEuros(year.interest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
