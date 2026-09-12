import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FieldLabel,
  HairlineSelect,
  RailSlider,
  RateInput,
  type SelectOption,
} from '@/components/ds'
import { Checkbox } from '@/components/ui/checkbox'
import type { PurchaseCosts } from '@/domain/costs'
import { euros, type Money, toNumber } from '@/domain/money'
import { FEDERAL_STATES } from '@/domain/states'
import type { StateCode } from '@/domain/types'
import { formatEuros, formatPercent, formatShortPercent, shareOf } from '@/lib/format'
import { cn } from '@/lib/utils'

import { SectionHeading } from './section-heading'

const PRICE_MIN = 100_000
const PRICE_MAX = 2_000_000
const PRICE_STEP = 10_000
const DOWN_STEP = 5_000

export type PropertyPatch = {
  price?: Money
  down?: Money
  stateCode?: StateCode
  notaryPercent?: number
  registryPercent?: number
  agentPercent?: number
  agentInvolved?: boolean
}

export type ThePropertyProps = {
  price: Money
  down: Money
  stateCode: StateCode
  notaryPercent: number
  registryPercent: number
  agentPercent: number
  agentInvolved: boolean
  costs: PurchaseCosts
  onChange: (patch: PropertyPatch) => void
}

/** Section 002: the price, what the buyer puts in, and every fee on top. */
export function TheProperty(props: ThePropertyProps): ReactElement {
  const { t } = useTranslation()
  const { price, down, costs, onChange } = props

  const stateOptions: SelectOption[] = FEDERAL_STATES.map((state) => ({
    value: state.code,
    label: `${state.name} · ${formatShortPercent(state.transferTaxPercent)}`,
  }))

  const downShare = shareOf(down, price)

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section)">
      <SectionHeading number="002">{t('sections.purchase')}</SectionHeading>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[clamp(20px,4vw,44px)]">
        <SliderField
          label={t('property.price')}
          reading={formatEuros(price)}
          value={toNumber(price)}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          valueText={formatEuros(price)}
          onChange={(value) => {
            onChange({ price: euros(value) })
          }}
        />

        <SliderField
          label={t('property.down')}
          reading={
            <>
              {formatEuros(down)}
              <span className="text-ink-3 text-label ml-1.5">{formatPercent(downShare)}</span>
            </>
          }
          value={toNumber(down)}
          min={0}
          max={Math.max(0, toNumber(price))}
          step={DOWN_STEP}
          valueText={`${formatEuros(down)}, ${formatPercent(downShare)}`}
          onChange={(value) => {
            onChange({ down: euros(value) })
          }}
        />

        <div className="grid grid-rows-[1fr_auto] gap-2">
          <div className="flex min-h-(--gs-reading-h) flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1">
            <FieldLabel>{t('property.state')}</FieldLabel>
            <span className="text-shu text-md font-mono tracking-[-0.02em] whitespace-nowrap">
              {formatShortPercent(costs.state.transferTaxPercent)}
            </span>
          </div>
          <HairlineSelect
            label={t('property.state')}
            value={props.stateCode}
            options={stateOptions}
            onChange={(value) => {
              onChange({ stateCode: value as StateCode })
            }}
          />
        </div>
      </div>

      <label className="border-rule-2 text-ink-2 mt-6.5 flex cursor-pointer items-center gap-3 border-t pt-5 text-sm">
        <Checkbox
          checked={props.agentInvolved}
          onCheckedChange={(checked) => {
            onChange({ agentInvolved: checked === true })
          }}
          className="data-[state=checked]:bg-shu data-[state=checked]:border-shu shrink-0"
        />
        <span>{t('property.agent')}</span>
      </label>

      <div className="h-[clamp(30px,5vw,48px)]" />

      <div className="border-rule border-t">
        <CostRow
          label={`${t('property.transfer')} · ${costs.state.name}`}
          share={formatShortPercent(costs.state.transferTaxPercent)}
          amount={formatEuros(costs.transferTax)}
        />
        <CostRow
          label={t('property.notary')}
          amount={formatEuros(costs.notaryFee)}
          rate={
            <RateInput
              label={`${t('property.notary')} %`}
              value={props.notaryPercent}
              max={10}
              onCommit={(notaryPercent) => {
                onChange({ notaryPercent })
              }}
            />
          }
        />
        <CostRow
          label={t('property.registry')}
          amount={formatEuros(costs.registryFee)}
          rate={
            <RateInput
              label={`${t('property.registry')} %`}
              value={props.registryPercent}
              max={10}
              onCommit={(registryPercent) => {
                onChange({ registryPercent })
              }}
            />
          }
        />
        {props.agentInvolved ? (
          <CostRow
            label={t('property.agentFee')}
            amount={formatEuros(costs.agentFee)}
            rate={
              <RateInput
                label={`${t('property.agentFee')} %`}
                value={props.agentPercent}
                max={15}
                onCommit={(agentPercent) => {
                  onChange({ agentPercent })
                }}
              />
            }
          />
        ) : null}

        <CostRow
          label={t('property.totalClosing')}
          share={formatPercent(shareOf(costs.closingCosts, price))}
          amount={formatEuros(costs.closingCosts)}
          emphasis="sum"
        />
        <CostRow
          label={t('property.downRow')}
          share={formatPercent(downShare)}
          amount={formatEuros(down)}
        />
        {/* The figure the whole section exists to produce: what has to be in the
            account on the day, which is not the down payment. */}
        <CostRow
          label={t('property.cashTotal')}
          share={formatPercent(shareOf(costs.cashNeeded, price))}
          amount={formatEuros(costs.cashNeeded)}
          emphasis="total"
        />
      </div>
    </section>
  )
}

type SliderFieldProps = {
  label: string
  reading: ReactNode
  value: number
  min: number
  max: number
  step: number
  valueText: string
  onChange: (value: number) => void
}

function SliderField({ label, reading, ...slider }: SliderFieldProps): ReactElement {
  return (
    <div className="grid grid-rows-[1fr_auto] gap-2">
      <div className="flex min-h-(--gs-reading-h) flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-md font-mono tracking-[-0.02em] whitespace-nowrap">{reading}</span>
      </div>
      <RailSlider label={label} {...slider} />
    </div>
  )
}

type CostRowProps = {
  label: string
  amount: string
  share?: string
  rate?: ReactNode
  emphasis?: 'sum' | 'total'
}

function CostRow({ label, amount, share, rate, emphasis }: CostRowProps): ReactElement {
  return (
    <div
      className={cn(
        'border-rule-2 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5',
        'border-b py-3.75 text-sm',
        emphasis === 'total' ? 'text-shu tracking-[0.04em]' : 'text-ink',
        emphasis === 'sum' && 'tracking-[0.02em]',
      )}
    >
      <span className="min-w-0">{label}</span>

      {rate ? (
        <span className="text-ink-3 inline-flex items-baseline gap-1 justify-self-end">
          {rate}
          <span className="text-label font-mono">%</span>
        </span>
      ) : (
        <span className="text-ink-3 text-label justify-self-end font-mono">{share ?? ''}</span>
      )}

      <span className="min-w-28 justify-self-end text-right font-mono text-sm tracking-[-0.02em]">
        {amount}
      </span>
    </div>
  )
}
