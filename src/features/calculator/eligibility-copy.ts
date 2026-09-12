import type { TFunction } from 'i18next'

import type { EligibilityReason, EnergyTarget, ProjectType } from '@/domain/types'
import { formatEuros } from '@/lib/format'

/**
 * Turn a machine-readable eligibility reason into a sentence.
 *
 * The domain returns reasons as data so the copy can live in the locale files
 * (STANDARDS.md §5). This is the one place that translation happens, which is why the
 * domain never has to know what language anyone is reading.
 */
export function reasonToText(reason: EligibilityReason, t: TFunction): string {
  switch (reason.kind) {
    case 'projectType':
      return t('eligibility.reasons.projectType', {
        types: reason.allowed
          .map((type: ProjectType) => t(`profile.projectOptions.${type}`))
          .join(', '),
      })
    case 'needsChild':
      return t('eligibility.reasons.needsChild')
    case 'incomeAboveLimit':
      return t('eligibility.reasons.incomeAboveLimit', { limit: formatEuros(reason.limit) })
    case 'alreadyOwns':
      return t('eligibility.reasons.alreadyOwns')
    case 'energyTarget':
      return t('eligibility.reasons.energyTarget', {
        targets: reason.allowed
          .map((target: EnergyTarget) => t(`profile.energyShort.${target}`))
          .join(t('eligibility.or')),
      })
    case 'needsGridFeed':
      return t('eligibility.reasons.needsGridFeed')
  }
}
