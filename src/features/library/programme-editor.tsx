import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Chip, FieldLabel, MoneyInput, RateInput, TextInput } from '@/components/ds'

import { ConfirmDialog } from './confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { euros, type Money } from '@/domain/money'
import { highestCeiling } from '@/domain/programmes'
import type { Programme, ProgrammeKey, ProjectType } from '@/domain/types'
import { formatVerifiedOn } from '@/lib/dates'
import type { Language } from '@/i18n/locales'

const PROJECT_TYPES: readonly ProjectType[] = ['newbuild', 'existing', 'renovate']

export type ProgrammeEditorProps = {
  programme: Programme
  /** Every other programme, for the "does not pair with" chips. */
  others: readonly Programme[]
  language: Language
  onChange: (patch: Partial<Programme>) => void
  onToggleProjectType: (value: ProjectType) => void
  onToggleExclusion: (value: ProgrammeKey) => void
  onDelete: () => void
}

/**
 * One programme's editable figures.
 *
 * The ceiling shown here is the *highest* the programme offers anyone: KfW 300 and 308
 * have tier grids that depend on the household, and flattening those to a single
 * editable number would quietly discard the tiers. Editing the ceiling therefore
 * replaces the grid with a flat figure, which is what the reader is asking for by
 * typing in this box, and the calculator then treats it as flat for everyone.
 */
export function ProgrammeEditor({
  programme,
  others,
  language,
  onChange,
  onToggleProjectType,
  onToggleExclusion,
  onDelete,
}: ProgrammeEditorProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6.5 gap-y-4.5 pt-1 pb-6.5">
      <Field label={t('library.name')} className="col-span-full">
        <TextInput
          label={t('library.name')}
          value={programme.name}
          onCommit={(name) => {
            onChange({ name })
          }}
          className="border-rule text-ink min-h-10.5 w-full border-b py-2.25 font-sans text-base"
        />
      </Field>

      <Field label={t('library.short')}>
        <TextInput
          label={t('library.short')}
          value={programme.short}
          onCommit={(short) => {
            onChange({ short })
          }}
          className="border-rule text-ink min-h-10.5 w-full border-b py-2.25 font-mono text-sm"
        />
      </Field>

      <Field label={t('library.cap')}>
        <MoneyInput
          label={t('library.cap')}
          value={highestCeiling(programme.ceiling)}
          onCommit={(amount: Money) => {
            onChange({ ceiling: { kind: 'flat', amount } })
          }}
        />
      </Field>

      <Field label={t('library.defaultAmount')}>
        <MoneyInput
          label={t('library.defaultAmount')}
          value={programme.defaultAmount}
          onCommit={(defaultAmount: Money) => {
            onChange({ defaultAmount })
          }}
        />
      </Field>

      <Field label={t('library.defaultRate')}>
        <RateInput
          label={t('library.defaultRate')}
          value={programme.defaultRatePercent}
          max={20}
          onCommit={(defaultRatePercent) => {
            onChange({ defaultRatePercent })
          }}
          className="w-full text-left text-sm"
        />
      </Field>

      <Field label={t('library.defaultYears')}>
        <RateInput
          label={t('library.defaultYears')}
          value={programme.defaultYears}
          max={40}
          onCommit={(defaultYears) => {
            onChange({ defaultYears })
          }}
          className="w-full text-left text-sm"
        />
      </Field>

      <Field label={t('library.defaultGrace')}>
        <RateInput
          label={t('library.defaultGrace')}
          value={programme.defaultGraceYears}
          max={10}
          onCommit={(defaultGraceYears) => {
            onChange({ defaultGraceYears })
          }}
          className="w-full text-left text-sm"
        />
      </Field>

      <Field label={t('library.incomeCap')}>
        <MoneyInput
          label={t('library.incomeCap')}
          value={programme.incomeCap ?? euros(0)}
          onCommit={(incomeCap: Money) => {
            // Zero means "no income test", which is how the field reads when empty.
            onChange({ incomeCap: incomeCap.isZero() ? null : incomeCap })
          }}
        />
      </Field>

      <div className="col-span-full flex flex-wrap gap-x-6.5 gap-y-4.5 pt-1">
        <ToggleField
          label={t('library.isKfw')}
          checked={programme.isKfw}
          onChange={(isKfw) => {
            onChange({ isKfw })
          }}
        />
        <ToggleField
          label={t('library.requiresChild')}
          checked={programme.requiresChild}
          onChange={(requiresChild) => {
            onChange({ requiresChild })
          }}
        />
        <ToggleField
          label={t('library.excludesOwners')}
          checked={programme.excludesExistingOwners}
          onChange={(excludesExistingOwners) => {
            onChange({ excludesExistingOwners })
          }}
        />
      </div>

      <fieldset className="col-span-full m-0 border-0 p-0">
        <legend className="text-ink-3 text-label tracking-wide-label mb-2.75 font-mono uppercase">
          {t('library.projectTypes')}
        </legend>
        <div className="flex flex-wrap gap-1.75">
          {PROJECT_TYPES.map((type) => (
            <Chip
              key={type}
              selected={programme.projectTypes.includes(type)}
              onToggle={() => {
                onToggleProjectType(type)
              }}
            >
              {t(`profile.projectOptions.${type}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="col-span-full m-0 border-0 p-0">
        <legend className="text-ink-3 text-label tracking-wide-label mb-2.75 font-mono uppercase">
          {t('library.excludes')}
        </legend>
        <div className="flex flex-wrap gap-1.75">
          {others.map((other) => (
            <Chip
              key={other.key}
              selected={programme.excludes.includes(other.key)}
              onToggle={() => {
                onToggleExclusion(other.key)
              }}
            >
              {other.short}
            </Chip>
          ))}
        </div>
      </fieldset>

      {/* Where this programme's figures came from, and when. */}
      <p className="text-ink-3 col-span-full m-0 text-xs">
        {programme.provenance.source
          ? t('provenance.verifiedOn', {
              source: new URL(programme.provenance.source).hostname,
              date: formatVerifiedOn(programme.provenance.verifiedOn, language),
            })
          : t('provenance.ourFigure')}
      </p>

      {/* Deleting takes every loan funded by this programme with it, so it asks
          first — and says so in the body, rather than after the fact. */}
      <div className="col-span-full pt-1.5">
        <ConfirmDialog
          title={t('library.deleteTitle')}
          body={t('library.deleteBody')}
          confirmLabel={t('library.delete')}
          onConfirm={onDelete}
        >
          <button
            type="button"
            className="border-rule squircle text-ink-3 hover:border-shu hover:text-shu text-label tracking-wide-label min-h-10 cursor-pointer rounded-md border bg-transparent px-3.75 py-2.25 font-mono uppercase transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]"
          >
            {t('library.delete')}
          </button>
        </ConfirmDialog>
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  children: ReactElement
  className?: string
}

function Field({ label, children, className }: FieldProps): ReactElement {
  return (
    <label className={className}>
      <FieldLabel className="mb-2">{label}</FieldLabel>
      {children}
    </label>
  )
}

type ToggleFieldProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleField({ label, checked, onChange }: ToggleFieldProps): ReactElement {
  return (
    <label className="text-ink-2 flex cursor-pointer items-center gap-2.25 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => {
          onChange(next === true)
        }}
        className="data-[state=checked]:bg-shu data-[state=checked]:border-shu shrink-0"
      />
      {label}
    </label>
  )
}
