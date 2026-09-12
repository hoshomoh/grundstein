import { euros, type Money } from '@/domain/money'
import { isStateCode } from '@/domain/states'
import type { Programme, Tranche } from '@/domain/types'
import { isLanguage } from '@/i18n/locales'

import {
  defaultSessionState,
  FONT_SCALES,
  type FontScale,
  type SessionState,
  type Theme,
} from './session-state'

/**
 * Bump this whenever the stored shape changes in a way an older payload cannot satisfy.
 * A payload from a different version is discarded rather than migrated: this is a
 * calculator holding a worked example, not a document, and starting from the defaults
 * costs a reader seconds. Were that ever untrue, this is where a migration would go.
 */
export const SCHEMA_VERSION = 1

export const STORAGE_KEY = 'grundstein-v2'

/** The narrow slice of Storage this app needs, injected rather than reached for. */
export type SessionStorage = {
  read: (key: string) => string | null
  write: (key: string, value: string) => void
}

/**
 * A Storage backed by the browser, tolerant of a browser that refuses.
 *
 * Safari in private mode and a user who has blocked site data both throw on access
 * rather than returning null. Losing persistence is survivable; a blank page is not
 * (STANDARDS.md §4).
 */
export function browserStorage(storage: Storage | undefined): SessionStorage {
  return {
    read: (key) => {
      try {
        return storage?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    write: (key, value) => {
      try {
        storage?.setItem(key, value)
      } catch {
        // Nothing to do and nothing worth telling the reader: their figures still work
        // for this visit, they simply will not survive a reload.
      }
    },
  }
}

/* Money is a Decimal, which JSON has no notion of, so every amount crosses as a
 * string. Storing them as numbers would put the figures back through binary floating
 * point on every reload — precisely what domain/money.ts exists to prevent. */
function moneyToJson(amount: Money): string {
  return amount.toString()
}

function moneyFromJson(value: unknown, fallback: Money): Money {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  try {
    const parsed = euros(value)
    return parsed.isFinite() && !parsed.isNegative() ? parsed : fallback
  } catch {
    return fallback
  }
}

function numberFromJson(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function booleanFromJson(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function themeFromJson(value: unknown, fallback: Theme): Theme {
  return value === 'light' || value === 'dark' || value === 'auto' ? value : fallback
}

function fontScaleFromJson(value: unknown, fallback: FontScale): FontScale {
  return FONT_SCALES.find((scale) => scale === value) ?? fallback
}

export function serialise(state: SessionState): string {
  return JSON.stringify({
    version: SCHEMA_VERSION,
    price: moneyToJson(state.price),
    down: moneyToJson(state.down),
    stateCode: state.stateCode,
    notaryPercent: state.notaryPercent,
    registryPercent: state.registryPercent,
    agentPercent: state.agentPercent,
    agentInvolved: state.agentInvolved,
    profile: { ...state.profile, income: moneyToJson(state.profile.income) },
    programmes: Object.fromEntries(
      Object.entries(state.programmes).map(([key, programme]) => [key, programmeToJson(programme)]),
    ),
    programmeOrder: state.programmeOrder,
    tranches: state.tranches.map((tranche) => ({
      ...tranche,
      amount: moneyToJson(tranche.amount),
    })),
    nextTrancheId: state.nextTrancheId,
    language: state.language,
    theme: state.theme,
    fontScale: state.fontScale,
  })
}

function programmeToJson(programme: Programme): unknown {
  return {
    ...programme,
    defaultAmount: moneyToJson(programme.defaultAmount),
    incomeCap: programme.incomeCap ? moneyToJson(programme.incomeCap) : null,
    incomeCapPerExtraChild: moneyToJson(programme.incomeCapPerExtraChild),
    ceiling:
      programme.ceiling.kind === 'flat'
        ? { kind: 'flat', amount: moneyToJson(programme.ceiling.amount) }
        : {
            kind: 'byChildren',
            tiers: programme.ceiling.tiers.map((tier) => ({
              minChildren: tier.minChildren,
              standard: moneyToJson(tier.standard),
              withQng: tier.withQng ? moneyToJson(tier.withQng) : null,
            })),
          },
    subsidy: programme.subsidy
      ? { ...programme.subsidy, maxAmount: moneyToJson(programme.subsidy.maxAmount) }
      : null,
  }
}

/**
 * Read a stored payload back, falling back field by field.
 *
 * Anything unrecognised is replaced with its default rather than throwing: a reader
 * whose stored figures are half-readable keeps the half that reads. The catalogue is
 * the exception — it is rebuilt from the shipped one unless it parses whole, because a
 * programme missing its ceiling would produce confidently wrong numbers rather than
 * obviously wrong ones.
 */
export function deserialise(raw: string | null): SessionState {
  const defaults = defaultSessionState()
  if (raw === null || raw === '') return defaults

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }

  if (!isRecord(parsed)) return defaults
  if (parsed.version !== SCHEMA_VERSION) return defaults

  const profile = isRecord(parsed.profile) ? parsed.profile : {}

  return {
    ...defaults,
    price: moneyFromJson(parsed.price, defaults.price),
    down: moneyFromJson(parsed.down, defaults.down),
    stateCode: isStateCode(parsed.stateCode) ? parsed.stateCode : defaults.stateCode,
    notaryPercent: numberFromJson(parsed.notaryPercent, defaults.notaryPercent),
    registryPercent: numberFromJson(parsed.registryPercent, defaults.registryPercent),
    agentPercent: numberFromJson(parsed.agentPercent, defaults.agentPercent),
    agentInvolved: booleanFromJson(parsed.agentInvolved, defaults.agentInvolved),

    profile: {
      ...defaults.profile,
      projectType:
        profile.projectType === 'newbuild' ||
        profile.projectType === 'existing' ||
        profile.projectType === 'renovate'
          ? profile.projectType
          : defaults.profile.projectType,
      children: numberFromJson(profile.children, defaults.profile.children),
      income: moneyFromJson(profile.income, defaults.profile.income),
      ownsHome: booleanFromJson(profile.ownsHome, defaults.profile.ownsHome),
      energy:
        typeof profile.energy === 'string' &&
        ['qng', 'eh40', 'eh55', 'eh85', 'none'].includes(profile.energy)
          ? (profile.energy as SessionState['profile']['energy'])
          : defaults.profile.energy,
      feedsGrid: booleanFromJson(profile.feedsGrid, defaults.profile.feedsGrid),
    },

    tranches: tranchesFromJson(parsed.tranches, defaults),
    nextTrancheId: numberFromJson(parsed.nextTrancheId, defaults.nextTrancheId),

    language: isLanguage(parsed.language) ? parsed.language : defaults.language,
    theme: themeFromJson(parsed.theme, defaults.theme),
    fontScale: fontScaleFromJson(parsed.fontScale, defaults.fontScale),
  }
}

function tranchesFromJson(value: unknown, defaults: SessionState): readonly Tranche[] {
  if (!Array.isArray(value)) return defaults.tranches

  const tranches = value.filter(isRecord).flatMap((raw): Tranche[] => {
    const id = raw.id
    const programmeKey = raw.programmeKey
    if (typeof id !== 'number' || typeof programmeKey !== 'string') return []

    return [
      {
        id,
        programmeKey,
        name: typeof raw.name === 'string' ? raw.name : programmeKey,
        amount: moneyFromJson(raw.amount, euros(0)),
        ratePercent: numberFromJson(raw.ratePercent, 3),
        years: numberFromJson(raw.years, 25),
        graceYears: numberFromJson(raw.graceYears, 0),
        followupPeriods: Array.isArray(raw.followupPeriods)
          ? raw.followupPeriods.filter(isRecord).map((period) => ({
              years: numberFromJson(period.years, 10),
              ratePercent: numberFromJson(period.ratePercent, 5),
            }))
          : [],
      },
    ]
  })

  return tranches
}
