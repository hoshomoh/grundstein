import { euros, type Money } from '@/domain/money'
import { PROGRAMME_ORDER, PROGRAMMES } from '@/domain/programmes'
import type { Profile, Programme, ProgrammeKey, StateCode, Tranche } from '@/domain/types'
import { DEFAULT_LANGUAGE, type Language } from '@/i18n/locales'

export type Theme = 'light' | 'dark' | 'auto'

/** The three steps of the A/A/A text-size control. */
export const FONT_SCALES = [1, 1.15, 1.32] as const
export type FontScale = (typeof FONT_SCALES)[number]

/**
 * Everything the app remembers.
 *
 * The programme catalogue is part of it: the Library lets a reader change a ceiling or
 * a rate, and those edits have to survive a reload alongside their loans.
 */
export type SessionState = {
  price: Money
  down: Money
  stateCode: StateCode
  notaryPercent: number
  registryPercent: number
  agentPercent: number
  agentInvolved: boolean

  profile: Profile

  programmes: Readonly<Record<ProgrammeKey, Programme>>
  programmeOrder: readonly ProgrammeKey[]

  tranches: readonly Tranche[]
  nextTrancheId: number

  language: Language
  theme: Theme
  fontScale: FontScale
}

/** A tranche built from a programme's own starting figures. */
export function trancheFrom(
  id: number,
  key: ProgrammeKey,
  programmes: Readonly<Record<ProgrammeKey, Programme>>,
): Tranche | null {
  const programme = programmes[key]
  if (!programme) return null

  return {
    id,
    programmeKey: key,
    name: programme.name,
    amount: programme.defaultAmount,
    ratePercent: programme.defaultRatePercent,
    years: programme.defaultYears,
    graceYears: programme.defaultGraceYears,
    followupPeriods: [],
  }
}

/**
 * The example the app opens with: a 600,000 € new build in Bayern for a family of two
 * children, funded by KfW 300, KfW 124 and a bank loan.
 *
 * Deliberately a worked example rather than an empty form. Someone who has never seen
 * a KfW loan learns more from a filled-in page they can push around than from a blank
 * one they have to guess at.
 */
export function defaultSessionState(language: Language = DEFAULT_LANGUAGE): SessionState {
  const programmes = PROGRAMMES
  const tranches = (['300', '124', 'bank'] as const)
    .map((key, index) => trancheFrom(index + 1, key, programmes))
    .filter((tranche): tranche is Tranche => tranche !== null)

  return {
    price: euros(600_000),
    down: euros(0),
    stateCode: 'BY',
    notaryPercent: 1.5,
    registryPercent: 0.5,
    agentPercent: 3.57,
    agentInvolved: true,

    profile: {
      projectType: 'newbuild',
      children: 2,
      income: euros(85_000),
      ownsHome: false,
      energy: 'eh40',
      feedsGrid: false,
    },

    programmes,
    programmeOrder: PROGRAMME_ORDER,

    tranches,
    nextTrancheId: tranches.length + 1,

    language,
    theme: 'auto',
    fontScale: 1,
  }
}

/** The down payment can never exceed the price, whichever of the two moved. */
export function withPrice(state: SessionState, price: Money): SessionState {
  return { ...state, price, down: state.down.greaterThan(price) ? price : state.down }
}

export function withDown(state: SessionState, down: Money): SessionState {
  return { ...state, down: down.greaterThan(state.price) ? state.price : down }
}

export function withTranche(
  state: SessionState,
  id: number,
  patch: Partial<Tranche>,
): SessionState {
  return {
    ...state,
    tranches: state.tranches.map((tranche) =>
      tranche.id === id ? { ...tranche, ...patch } : tranche,
    ),
  }
}

export function addTranche(state: SessionState, key: ProgrammeKey): SessionState {
  const tranche = trancheFrom(state.nextTrancheId, key, state.programmes)
  if (!tranche) return state

  return {
    ...state,
    tranches: [...state.tranches, tranche],
    nextTrancheId: state.nextTrancheId + 1,
  }
}

export function removeTranche(state: SessionState, id: number): SessionState {
  return { ...state, tranches: state.tranches.filter((tranche) => tranche.id !== id) }
}

/**
 * Delete a programme from the catalogue.
 *
 * Any tranche funded by it goes too — leaving one behind would give it a programme key
 * that resolves to nothing, and every ceiling and rule it depends on would vanish.
 */
export function removeProgramme(state: SessionState, key: ProgrammeKey): SessionState {
  const programmes = { ...state.programmes }
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the catalogue is user-editable
  delete programmes[key]

  return {
    ...state,
    programmes,
    programmeOrder: state.programmeOrder.filter((existing) => existing !== key),
    tranches: state.tranches.filter((tranche) => tranche.programmeKey !== key),
  }
}

/**
 * Put the original eight programmes back.
 *
 * The reader's own figures — price, down payment, answers — are untouched, and so is
 * any tranche whose programme still exists afterwards. Only tranches funded by a
 * programme the reader invented are dropped, because those programmes are gone.
 */
export function restoreProgrammes(state: SessionState): SessionState {
  return {
    ...state,
    programmes: PROGRAMMES,
    programmeOrder: PROGRAMME_ORDER,
    tranches: state.tranches.filter((tranche) => tranche.programmeKey in PROGRAMMES),
  }
}
