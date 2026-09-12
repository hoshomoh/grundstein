import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ds'
import type { Money } from '@/domain/money'
import type { Portfolio } from '@/domain/portfolio'
import type { Programme, ProgrammeKey } from '@/domain/types'
import {
  formatEuros,
  formatEurosWithCents,
  formatPercent,
  percentWidth,
  shareOf,
} from '@/lib/format'

import { SectionHeading } from './section-heading'

export type WhatEachLoanCostsProps = {
  portfolio: Portfolio
  programmes: Readonly<Record<ProgrammeKey, Programme>>
}

/** Section 005: what each loan costs over its whole life, borrowed against interest. */
export function WhatEachLoanCosts({ portfolio, programmes }: WhatEachLoanCostsProps): ReactElement {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section)">
      <SectionHeading number="005" className="mb-3">
        {t('sections.ledger')}
      </SectionHeading>

      <p className="text-ink-2 mb-[clamp(26px,4vw,40px)] max-w-[56ch] text-xs">
        {t('ledger.note')}
      </p>

      <div className="border-rule border-t">
        {portfolio.rows.map((row) => {
          const programme = programmes[row.programmeKey]
          const lifetime = row.repayable.plus(row.totalInterest)
          const payments = [
            formatEurosWithCents(row.firstRepayment),
            ...row.segments.map((segment) => formatEurosWithCents(segment.monthlyPayment)),
          ].join(' → ')

          return (
            <LedgerRow
              key={row.trancheId}
              badge={programme?.isKfw === true ? 'KfW' : t('tranche.add')}
              tone={programme?.isKfw === true ? 'kfw' : 'bank'}
              name={row.name}
              terms={`${formatPercent(row.ratePercent)} · ${String(row.years)} ${t('tranche.yearAbbrev')}${
                row.graceYears > 0
                  ? ` · ${String(row.graceYears)} ${t('tranche.yearAbbrev')} ${t('tranche.grace').toLowerCase()}`
                  : ''
              }`}
              interestShare={shareOf(row.totalInterest, lifetime)}
              principalWidth={percentWidth(row.repayable, lifetime)}
              interestWidth={percentWidth(row.totalInterest, lifetime)}
              borrowed={row.repayable}
              interest={row.totalInterest}
              interestLabel={`${t('tranche.interestOver')} ${String(row.years)} ${t('tranche.yearAbbrev')}`}
              monthly={payments}
            />
          )
        })}

        {portfolio.rows.length > 0 ? (
          <LedgerRow
            badge="Σ"
            tone="total"
            name={t('ledger.everything')}
            terms={`${formatPercent(portfolio.blendedRatePercent)} ${t('ledger.blended')}`}
            interestShare={shareOf(
              portfolio.totalInterest,
              portfolio.totalBorrowed.plus(portfolio.totalInterest),
            )}
            principalWidth={percentWidth(
              portfolio.totalBorrowed,
              portfolio.totalBorrowed.plus(portfolio.totalInterest),
            )}
            interestWidth={percentWidth(
              portfolio.totalInterest,
              portfolio.totalBorrowed.plus(portfolio.totalInterest),
            )}
            borrowed={portfolio.totalBorrowed}
            interest={portfolio.totalInterest}
            interestLabel={`${t('tranche.interestOver')} ${String(portfolio.yearly.length)} ${t('tranche.yearAbbrev')}`}
            monthly={formatEurosWithCents(portfolio.peakPayment)}
          />
        ) : null}
      </div>
    </section>
  )
}

type LedgerRowProps = {
  badge: string
  tone: 'kfw' | 'bank' | 'total'
  name: string
  terms: string
  interestShare: number
  principalWidth: string
  interestWidth: string
  borrowed: Money
  interest: Money
  interestLabel: string
  monthly: string
}

function LedgerRow({
  badge,
  tone,
  name,
  terms,
  interestShare,
  principalWidth,
  interestWidth,
  borrowed,
  interest,
  interestLabel,
  monthly,
}: LedgerRowProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="border-rule-2 border-b py-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
        <Badge tone={tone}>{badge}</Badge>
        <span className="font-display min-w-0 flex-1 basis-45 text-lg">{name}</span>
        <span className="flex shrink-0 items-baseline gap-3.5">
          <span className="text-ink-3 text-label tracking-label font-mono uppercase">{terms}</span>
          <span className="text-shu font-mono text-sm tracking-[-0.02em] whitespace-nowrap">
            {formatPercent(interestShare)} {t('chart.interest').toLowerCase()}
          </span>
        </span>
      </div>

      {/* Decoration: every figure in it is written out beneath. */}
      <div aria-hidden className="squircle mb-2 flex h-5.5 overflow-hidden rounded-sm">
        <div
          className="bg-ink opacity-42 transition-[width] duration-500 ease-(--ease-gs)"
          style={{ width: principalWidth }}
        />
        <div
          className="bg-shu transition-[width] duration-500 ease-(--ease-gs)"
          style={{ width: interestWidth }}
        />
      </div>

      <dl className="flex flex-wrap gap-x-6.5 gap-y-1 font-mono text-xs">
        <div>
          <dt className="text-ink-3 text-label tracking-label uppercase">
            {t('tranche.borrowed')}
          </dt>
          <dd className="text-ink-2 m-0">{formatEuros(borrowed)}</dd>
        </div>
        <div>
          <dt className="text-ink-3 text-label tracking-label uppercase">{interestLabel}</dt>
          <dd className="text-shu m-0">+ {formatEuros(interest)}</dd>
        </div>
        <div className="ml-auto text-right">
          <dt className="text-ink-3 text-label tracking-label uppercase">{t('tranche.monthly')}</dt>
          <dd className="text-ink m-0">{monthly}</dd>
        </div>
      </dl>
    </div>
  )
}
