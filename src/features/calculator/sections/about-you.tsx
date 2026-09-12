import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldLabel, HairlineSelect, MoneyInput, type SelectOption } from '@/components/ds'
import type { Money } from '@/domain/money'
import type { EnergyTarget, Profile, ProjectType } from '@/domain/types'

import { SectionHeading } from './section-heading'

export type AboutYouProps = {
  profile: Profile
  onChange: (patch: Partial<Profile>) => void
  /** Only asked when a loan that cares about it is in play. */
  showGridFeed: boolean
}

const PROJECT_TYPES: readonly ProjectType[] = ['newbuild', 'existing', 'renovate']
const ENERGY_TARGETS: readonly EnergyTarget[] = ['qng', 'eh40', 'eh55', 'eh85', 'none']
const CHILD_COUNTS = [0, 1, 2, 3, 4, 5] as const

/** Section 001: the five answers every eligibility rule is tested against. */
export function AboutYou({ profile, onChange, showGridFeed }: AboutYouProps): ReactElement {
  const { t } = useTranslation()

  const projectOptions: SelectOption[] = PROJECT_TYPES.map((value) => ({
    value,
    label: t(`profile.projectOptions.${value}`),
  }))

  const energyOptions: SelectOption[] = ENERGY_TARGETS.map((value) => ({
    value,
    label: t(`profile.energyOptions.${value}`),
  }))

  const childOptions: SelectOption[] = CHILD_COUNTS.map((count) => ({
    value: String(count),
    label: count === 5 ? t('profile.childrenMore') : String(count),
  }))

  const yesNo: SelectOption[] = [
    { value: 'no', label: t('profile.no') },
    { value: 'yes', label: t('profile.yes') },
  ]

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section)">
      <SectionHeading number="001">{t('sections.situation')}</SectionHeading>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[clamp(22px,4vw,40px)]">
        <Field label={t('profile.project')} htmlFor="profile-project">
          <HairlineSelect
            id="profile-project"
            label={t('profile.project')}
            value={profile.projectType}
            options={projectOptions}
            onChange={(value) => {
              onChange({ projectType: value as ProjectType })
            }}
          />
        </Field>

        <Field label={t('profile.children')} htmlFor="profile-children">
          <HairlineSelect
            id="profile-children"
            label={t('profile.children')}
            value={String(profile.children)}
            options={childOptions}
            onChange={(value) => {
              onChange({ children: Number(value) })
            }}
          />
        </Field>

        <Field label={t('profile.income')} htmlFor="profile-income">
          <MoneyInput
            id="profile-income"
            label={t('profile.income')}
            value={profile.income}
            onCommit={(income: Money) => {
              onChange({ income })
            }}
          />
        </Field>

        <Field label={t('profile.owns')} htmlFor="profile-owns">
          <HairlineSelect
            id="profile-owns"
            label={t('profile.owns')}
            value={profile.ownsHome ? 'yes' : 'no'}
            options={yesNo}
            onChange={(value) => {
              onChange({ ownsHome: value === 'yes' })
            }}
          />
        </Field>

        <Field label={t('profile.energy')} htmlFor="profile-energy">
          <HairlineSelect
            id="profile-energy"
            label={t('profile.energy')}
            value={profile.energy}
            options={energyOptions}
            onChange={(value) => {
              onChange({ energy: value as EnergyTarget })
            }}
          />
        </Field>

        {/* Asked only when a loan in play depends on it, so nobody is made to answer a
            question about solar panels to work out a new build's monthly payment. */}
        {showGridFeed ? (
          <Field label={t('profile.feedsGrid')} htmlFor="profile-grid">
            <HairlineSelect
              id="profile-grid"
              label={t('profile.feedsGrid')}
              value={profile.feedsGrid ? 'yes' : 'no'}
              options={yesNo}
              onChange={(value) => {
                onChange({ feedsGrid: value === 'yes' })
              }}
            />
          </Field>
        ) : null}
      </div>
    </section>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  children: ReactElement
}

function Field({ label, htmlFor, children }: FieldProps): ReactElement {
  return (
    <div className="block">
      <label htmlFor={htmlFor}>
        <FieldLabel className="mb-2.5">{label}</FieldLabel>
      </label>
      {children}
    </div>
  )
}
