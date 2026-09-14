import { checkEligibility, excludedProgrammes } from './eligibility'
import { atLeastZero, equalToTheCent, min, type Money, sum } from './money'
import { fundingNeeded } from './portfolio'
import { maxLoanFor } from './programmes'
import type { Profile, Programme, ProgrammeKey, Tranche } from './types'

/** One loan in a proposed package: which programme, and how much of it. */
export type SuggestedTranche = {
  programmeKey: ProgrammeKey
  amount: Money
}

export type Suggestion = {
  tranches: readonly SuggestedTranche[]
  /** The price less the down payment — what the package has to cover. */
  needed: Money
  funded: Money
  /** What no programme this household qualifies for could reach. */
  shortfall: Money
}

export type SuggestionInput = {
  price: Money
  down: Money
  profile: Profile
  programmes: Readonly<Record<ProgrammeKey, Programme>>
  /** The catalogue's own order. Breaks ties between programmes at the same rate. */
  programmeOrder: readonly ProgrammeKey[]
}

/**
 * A financing package for these answers: the cheapest money first, up to what each
 * programme will lend this household, with the rest on the bank loan.
 *
 * **Cheapest first, and that is the whole rule.** Every programme the household
 * qualifies for is sorted by its rate and taken in turn at the most it will lend, until
 * the purchase is covered. Subsidised money is used before market money because it is
 * cheaper, which is the only reason a KfW loan is worth the paperwork.
 *
 * This is deliberately a starting point rather than an optimum. A true optimiser would
 * weigh a programme's Tilgungszuschuss, its grace years and its term against the
 * others, and would sometimes prefer a pair of loans to the single cheapest one. The
 * reader can see every figure and move every slider; what they need from this button is
 * a sensible arrangement to push around, not a black box that claims to be optimal.
 *
 * Nothing here decides what a household qualifies for or what clashes with what: that
 * is `checkEligibility` and `excludedProgrammes`, and this reads both rather than
 * repeating either.
 */
export function suggestPackage(input: SuggestionInput): Suggestion {
  const { price, down, profile, programmes, programmeOrder } = input
  const needed = fundingNeeded(price, down)

  // Walked in catalogue order and sorted by rate. `sort` is stable, so two programmes
  // at the same rate keep the catalogue's order between them and the same answers
  // always produce the same package.
  const candidates = programmeOrder
    .map((key) => programmes[key])
    .filter((programme): programme is Programme => programme !== undefined)
    .filter((programme) => checkEligibility(programme, profile).ok)
    .sort((a, b) => a.defaultRatePercent - b.defaultRatePercent)

  const tranches: SuggestedTranche[] = []
  const blocked = new Set<ProgrammeKey>()
  let remaining = needed

  for (const programme of candidates) {
    if (!remaining.greaterThan(0)) break
    if (blocked.has(programme.key)) continue

    const amount = min(maxLoanFor(programme.ceiling, profile), remaining)
    if (!amount.greaterThan(0)) continue

    tranches.push({ programmeKey: programme.key, amount })
    for (const clash of excludedProgrammes(programme.key, programmes)) blocked.add(clash)
    remaining = remaining.minus(amount)
  }

  const funded = sum(tranches.map((tranche) => tranche.amount))

  return { tranches, needed, funded, shortfall: atLeastZero(needed.minus(funded)) }
}

/**
 * Whether the loans on the page are already the suggested package.
 *
 * Used to keep the proposal out of the way once it has been taken: an offer to apply
 * what is already applied is noise, and a button that does nothing teaches the reader
 * to ignore buttons.
 */
export function matchesSuggestion(tranches: readonly Tranche[], suggestion: Suggestion): boolean {
  const funded = tranches.filter((tranche) => tranche.amount.greaterThan(0))
  if (funded.length !== suggestion.tranches.length) return false

  return suggestion.tranches.every((suggested, index) => {
    const actual = funded[index]
    return (
      actual?.programmeKey === suggested.programmeKey &&
      equalToTheCent(actual.amount, suggested.amount)
    )
  })
}
