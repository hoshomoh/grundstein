import { describe, expect, it } from 'vitest'

import { checkEligibility } from './eligibility'
import { equalToTheCent, euros, isZeroToTheCent } from './money'
import { PROGRAMME_ORDER, PROGRAMMES, maxLoanFor } from './programmes'
import { matchesSuggestion, suggestPackage, type Suggestion } from './suggestion'
import type { Profile, Programme, ProgrammeKey, Tranche } from './types'

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    projectType: 'newbuild',
    children: 2,
    income: euros(85_000),
    ownsHome: false,
    energy: 'eh40',
    feedsGrid: false,
    ...overrides,
  }
}

function suggest(price: number, down: number, who: Profile = profile()): Suggestion {
  return suggestPackage({
    price: euros(price),
    down: euros(down),
    profile: who,
    programmes: PROGRAMMES,
    programmeOrder: PROGRAMME_ORDER,
  })
}

/** One place that turns a key into a programme, so no assertion is scattered around. */
function programme(key: ProgrammeKey): Programme {
  const found = PROGRAMMES[key]
  if (!found) throw new Error(`no programme ${key} in the catalogue`)
  return found
}

function keys(suggestion: Suggestion): string[] {
  return suggestion.tranches.map((tranche) => tranche.programmeKey)
}

describe('suggesting a package', () => {
  it('covers the price less the down payment, and no more', () => {
    const suggestion = suggest(600_000, 120_000)

    expect(equalToTheCent(suggestion.needed, euros(480_000))).toBe(true)
    expect(equalToTheCent(suggestion.funded, euros(480_000))).toBe(true)
    expect(isZeroToTheCent(suggestion.shortfall)).toBe(true)
  })

  /* The whole reason to bother with a KfW loan is that the money is cheaper, so the
   * cheapest money is taken first and the bank picks up what is left. */
  it('takes the cheapest money first and leaves the rest to the bank', () => {
    const suggestion = suggest(600_000, 120_000)
    const rates = suggestion.tranches.map(
      (tranche) => programme(tranche.programmeKey).defaultRatePercent,
    )

    expect([...rates]).toEqual([...rates].sort((a, b) => a - b))
    expect(keys(suggestion).at(-1)).toBe('bank')
  })

  it('never offers a household more than a programme would lend it', () => {
    const oneChild = profile({ children: 1 })
    const suggestion = suggest(900_000, 50_000, oneChild)

    for (const tranche of suggestion.tranches) {
      const ceiling = maxLoanFor(programme(tranche.programmeKey).ceiling, oneChild)
      expect(tranche.amount.greaterThan(ceiling)).toBe(false)
    }
  })

  it('offers nothing the household does not qualify for', () => {
    const owner = profile({ ownsHome: true, children: 0 })
    const suggestion = suggest(600_000, 120_000, owner)

    for (const tranche of suggestion.tranches) {
      expect(checkEligibility(programme(tranche.programmeKey), owner).ok).toBe(true)
    }
  })

  /* KfW 300 excludes 297, 298 and 261. A package that contained both would be one the
   * reader could never actually be granted. */
  it('never puts two loans in that cannot fund the same home', () => {
    const suggestion = suggest(900_000, 50_000)
    const chosen = new Set(keys(suggestion))

    for (const key of chosen) {
      for (const clash of programme(key).excludes) {
        expect(chosen.has(clash)).toBe(false)
      }
    }
  })

  it('reports a shortfall rather than inventing a loan to close it', () => {
    // Beyond the bank's own two-million ceiling, nothing can reach.
    const suggestion = suggest(4_000_000, 0)
    expect(suggestion.shortfall.greaterThan(0)).toBe(true)
    expect(suggestion.funded.lessThan(suggestion.needed)).toBe(true)
  })

  it('suggests nothing when the buyer is paying cash', () => {
    const suggestion = suggest(400_000, 400_000)
    expect(suggestion.tranches).toHaveLength(0)
    expect(isZeroToTheCent(suggestion.shortfall)).toBe(true)
  })

  /* The same answers must always produce the same package — a button that shuffles its
   * own advice between renders is not advice. */
  it('is stable for the same answers', () => {
    expect(keys(suggest(600_000, 120_000))).toEqual(keys(suggest(600_000, 120_000)))
  })

  it('moves with the household, because the ceilings do', () => {
    const small = suggest(900_000, 50_000, profile({ children: 1 }))
    const large = suggest(900_000, 50_000, profile({ children: 5, energy: 'qng' }))

    const kfw = (suggestion: Suggestion) =>
      suggestion.tranches.find((tranche) => tranche.programmeKey === '300')?.amount

    expect(kfw(small)?.equals(euros(170_000))).toBe(true)
    expect(kfw(large)?.equals(euros(270_000))).toBe(true)
  })
})

describe('recognising a package already in place', () => {
  function trancheOf(suggestion: Suggestion): Tranche[] {
    return suggestion.tranches.map((suggested, index) => ({
      id: index,
      programmeKey: suggested.programmeKey,
      name: programme(suggested.programmeKey).name,
      amount: suggested.amount,
      ratePercent: 3,
      years: 25,
      graceYears: 0,
      followupPeriods: [],
    }))
  }

  it('matches the loans it just proposed', () => {
    const suggestion = suggest(600_000, 120_000)
    expect(matchesSuggestion(trancheOf(suggestion), suggestion)).toBe(true)
  })

  it('does not match once an amount has moved', () => {
    const suggestion = suggest(600_000, 120_000)
    const moved = trancheOf(suggestion).map((tranche, index) =>
      index === 0 ? { ...tranche, amount: tranche.amount.plus(euros(5_000)) } : tranche,
    )
    expect(matchesSuggestion(moved, suggestion)).toBe(false)
  })

  it('ignores loans zeroed out of the way', () => {
    const suggestion = suggest(600_000, 120_000)
    const withZero = [
      ...trancheOf(suggestion),
      {
        id: 99,
        programmeKey: '270' as const,
        name: 'unused',
        amount: euros(0),
        ratePercent: 4,
        years: 10,
        graceYears: 0,
        followupPeriods: [],
      },
    ]
    expect(matchesSuggestion(withZero, suggestion)).toBe(true)
  })
})
