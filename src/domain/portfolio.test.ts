import { describe, expect, it } from 'vitest'

import { equalToTheCent, euros, isZeroToTheCent, sum, toCents } from './money'
import { PROGRAMMES } from './programmes'
import { buildPortfolio, byYear, coverOf, monthsOfYear, subsidyForTranche } from './portfolio'
import type { Profile, Tranche } from './types'

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

function tranche(overrides: Partial<Tranche> = {}): Tranche {
  return {
    id: 1,
    programmeKey: 'bank',
    name: 'Bank mortgage',
    amount: euros(300_000),
    ratePercent: 3.8,
    years: 25,
    graceYears: 0,
    followupPeriods: [],
    ...overrides,
  }
}

describe('buildPortfolio', () => {
  it('is empty for no tranches', () => {
    const portfolio = buildPortfolio([], PROGRAMMES, profile())
    expect(portfolio.rows).toEqual([])
    expect(portfolio.months).toEqual([])
    expect(portfolio.totalBorrowed.isZero()).toBe(true)
    expect(portfolio.peakPayment.isZero()).toBe(true)
    expect(portfolio.blendedRatePercent).toBe(0)
  })

  /* A tranche at zero is not funding anything. Keeping it would put an empty row in
   * the ledger and a zero-width band in the capital-structure bar. */
  it('leaves out a tranche set to zero', () => {
    const portfolio = buildPortfolio(
      [tranche({ id: 1 }), tranche({ id: 2, amount: euros(0) })],
      PROGRAMMES,
      profile(),
    )
    expect(portfolio.rows).toHaveLength(1)
    expect(portfolio.rows[0]?.trancheId).toBe(1)
  })

  it('adds up what was borrowed and what it costs', () => {
    const portfolio = buildPortfolio(
      [
        tranche({ id: 1, amount: euros(200_000) }),
        tranche({ id: 2, amount: euros(100_000), ratePercent: 2 }),
      ],
      PROGRAMMES,
      profile(),
    )

    expect(portfolio.totalBorrowed.equals(euros(300_000))).toBe(true)
    expect(
      portfolio.totalInterest.equals(sum(portfolio.rows.map((row) => row.totalInterest))),
    ).toBe(true)
  })

  /* Two loans of different lengths: the household's payment in a month is whatever is
   * still running then, and the merged schedule runs as long as the longest. */
  it('runs as long as the longest tranche and sums what overlaps', () => {
    const portfolio = buildPortfolio(
      [
        tranche({ id: 1, years: 10, amount: euros(100_000) }),
        tranche({ id: 2, years: 25, amount: euros(100_000) }),
      ],
      PROGRAMMES,
      profile(),
    )

    expect(portfolio.months).toHaveLength(300)

    const short = buildPortfolio(
      [tranche({ id: 2, years: 25, amount: euros(100_000) })],
      PROGRAMMES,
      profile(),
    )
    // After month 120 only the long loan is paying, so the totals must agree.
    expect(
      toCents(portfolio.months[200]?.payment ?? euros(0)).equals(
        toCents(short.months[200]?.payment ?? euros(-1)),
      ),
    ).toBe(true)
  })

  it('weights the blended rate by amount, not by count', () => {
    const portfolio = buildPortfolio(
      [
        tranche({ id: 1, amount: euros(300_000), ratePercent: 4 }),
        tranche({ id: 2, amount: euros(100_000), ratePercent: 8 }),
      ],
      PROGRAMMES,
      profile(),
    )
    // (300k × 4 + 100k × 8) / 400k = 5
    expect(portfolio.blendedRatePercent).toBe(5)
  })

  /* The headline figure. With a grace period the first payment is smaller than what
   * the household must actually be able to afford later. */
  it('reports the peak payment, which a grace period pushes past the first', () => {
    const portfolio = buildPortfolio([tranche({ graceYears: 3 })], PROGRAMMES, profile())
    const first = portfolio.months[0]?.payment ?? euros(0)
    expect(portfolio.peakPayment.greaterThan(first)).toBe(true)
  })

  it('closes every tranche it contains', () => {
    const portfolio = buildPortfolio(
      [
        tranche({ id: 1, amount: euros(200_000), years: 20, graceYears: 2 }),
        tranche({ id: 2, amount: euros(90_000), years: 30, ratePercent: 1.2 }),
      ],
      PROGRAMMES,
      profile(),
    )

    const repaid = sum(portfolio.months.map((month) => month.principal))
    const owed = sum(portfolio.rows.map((row) => row.repayable))
    expect(isZeroToTheCent(repaid.minus(owed))).toBe(true)
  })
})

describe('the Tilgungszuschuss', () => {
  it('applies to KfW 261 at the rate its energy standard earns', () => {
    const row = buildPortfolio(
      [tranche({ programmeKey: '261', amount: euros(150_000) })],
      PROGRAMMES,
      profile({ energy: 'eh40' }),
    ).rows[0]

    // EH40 earns 10%, which is 15,000 € — under the 22,500 € cap.
    expect(row?.subsidy.equals(euros(15_000))).toBe(true)
    expect(row?.repayable.equals(euros(135_000))).toBe(true)
  })

  it('is capped in absolute terms', () => {
    const row = buildPortfolio(
      [tranche({ programmeKey: '261', amount: euros(150_000) })],
      PROGRAMMES,
      profile({ energy: 'qng' }),
    ).rows[0]

    // QNG earns 15% = 22,500 €, exactly the cap.
    expect(row?.subsidy.equals(euros(22_500))).toBe(true)
  })

  it('is nothing where the household has no energy target', () => {
    const row = buildPortfolio(
      [tranche({ programmeKey: '261', amount: euros(150_000) })],
      PROGRAMMES,
      profile({ energy: 'none' }),
    ).rows[0]

    expect(row?.subsidy.isZero()).toBe(true)
    expect(row?.repayable.equals(euros(150_000))).toBe(true)
  })

  it('is nothing for a programme that pays none', () => {
    expect(subsidyForTranche(tranche(), PROGRAMMES.bank, profile({ energy: 'qng' })).isZero()).toBe(
      true,
    )
  })

  it('makes the loan genuinely cheaper', () => {
    const withSubsidy = buildPortfolio(
      [tranche({ programmeKey: '261', amount: euros(150_000) })],
      PROGRAMMES,
      profile({ energy: 'qng' }),
    )
    const without = buildPortfolio(
      [tranche({ programmeKey: '261', amount: euros(150_000) })],
      PROGRAMMES,
      profile({ energy: 'none' }),
    )

    expect(withSubsidy.totalInterest.lessThan(without.totalInterest)).toBe(true)
    expect(withSubsidy.peakPayment.lessThan(without.peakPayment)).toBe(true)
  })
})

describe('byYear and monthsOfYear', () => {
  const portfolio = buildPortfolio([tranche({ years: 25 })], PROGRAMMES, profile())

  it('collapses 300 months into 25 years', () => {
    expect(byYear(portfolio.months)).toHaveLength(25)
  })

  /* To the cent, not exactly. Decimal addition at a fixed precision is not associative:
   * summing 300 months directly and summing them in 25 groups of 12 differ at the 34th
   * significant digit, about 4e-28 €. That is a property of the arithmetic, not a
   * defect, and the cent is the unit anyone can act on. */
  it('loses nothing in the collapsing, to the cent', () => {
    const yearly = byYear(portfolio.months)
    const fromYears = sum(yearly.map((year) => year.interest))
    const fromMonths = sum(portfolio.months.map((month) => month.interest))
    expect(equalToTheCent(fromYears, fromMonths)).toBe(true)
  })

  it('returns the twelve months of a year', () => {
    expect(monthsOfYear(portfolio.months, 0)).toHaveLength(12)
    expect(monthsOfYear(portfolio.months, 24)).toHaveLength(12)
  })

  it('returns nothing for a year beyond the schedule', () => {
    expect(monthsOfYear(portfolio.months, 99)).toHaveLength(0)
  })
})

describe('coverOf', () => {
  it('is covered when the loans meet the price less the down payment', () => {
    expect(coverOf(euros(500_000), euros(600_000), euros(100_000)).status).toBe('covered')
  })

  it('is short when they do not', () => {
    const cover = coverOf(euros(400_000), euros(600_000), euros(100_000))
    expect(cover.status).toBe('short')
    expect(cover.difference.equals(euros(100_000))).toBe(true)
  })

  it('is over when they exceed it', () => {
    const cover = coverOf(euros(600_000), euros(600_000), euros(100_000))
    expect(cover.status).toBe('over')
    expect(cover.difference.equals(euros(100_000))).toBe(true)
  })

  /* A cent either way is rounding, not a shortfall, and telling someone they are
   * 0,01 € short of their house would be absurd. */
  it('treats a sub-euro difference as covered', () => {
    expect(coverOf(euros('499999.50'), euros(600_000), euros(100_000)).status).toBe('covered')
  })
})

/* The bug this guards: a ceiling is not a constant. KfW 300's is a grid of children ×
 * QNG, so a household that slides its loan to the five-child tier and then answers
 * "one child" has a ceiling 100.000 € below the figure still sitting in the state. The
 * page went on amortising the old number — quoting a monthly payment on money that
 * household would be refused, which is the one thing this app must not do. */
describe('a ceiling that moves under a loan', () => {
  const bigFamily = profile({ children: 5, energy: 'qng' })
  const oneChild = profile({ children: 1, energy: 'eh40' })
  const asked = tranche({ programmeKey: '300', amount: euros(270_000), ratePercent: 1.12 })

  it('lends the whole amount while the household still qualifies for it', () => {
    const [row] = buildPortfolio([asked], PROGRAMMES, bigFamily).rows
    expect(row?.amount.equals(euros(270_000))).toBe(true)
    expect(row?.requested.equals(euros(270_000))).toBe(true)
  })

  it('drops to the new ceiling when the answers change', () => {
    const [row] = buildPortfolio([asked], PROGRAMMES, oneChild).rows
    expect(row?.amount.equals(euros(170_000))).toBe(true)
  })

  it('keeps what the reader asked for, so the interface can say what it did', () => {
    const [row] = buildPortfolio([asked], PROGRAMMES, oneChild).rows
    expect(row?.requested.equals(euros(270_000))).toBe(true)
  })

  it('charges interest on the drawable figure, not the asked-for one', () => {
    const capped = buildPortfolio([asked], PROGRAMMES, oneChild)
    const atCeiling = buildPortfolio(
      [tranche({ ...asked, amount: euros(170_000) })],
      PROGRAMMES,
      oneChild,
    )

    expect(equalToTheCent(capped.totalInterest, atCeiling.totalInterest)).toBe(true)
    expect(equalToTheCent(capped.peakPayment, atCeiling.peakPayment)).toBe(true)
  })

  /* Nothing is written back to the tranche, so the answer is reversible. */
  it('restores the figure when the answers go back', () => {
    const [row] = buildPortfolio([asked], PROGRAMMES, bigFamily).rows
    expect(row?.amount.equals(euros(270_000))).toBe(true)
  })

  /* A childless household is below KfW 300's lowest tier: the ceiling is nothing, so
   * the loan funds nothing and has no schedule at all. */
  it('drops a loan the household cannot have to nothing', () => {
    const none = buildPortfolio([asked], PROGRAMMES, profile({ children: 0 }))
    expect(none.rows).toHaveLength(0)
    expect(isZeroToTheCent(none.totalBorrowed)).toBe(true)
  })

  /* A flat ceiling does not move, so nothing is capped and nothing is announced. */
  it('leaves a flat-ceiling loan alone', () => {
    const [row] = buildPortfolio([tranche()], PROGRAMMES, oneChild).rows
    expect(row?.amount.equals(euros(300_000))).toBe(true)
    expect(row?.requested.equals(euros(300_000))).toBe(true)
  })
})
