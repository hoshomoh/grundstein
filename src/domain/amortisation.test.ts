import { describe, expect, it } from 'vitest'

import { amortise, annuity, subsidyFor, type AmortiseInput } from './amortisation'
import { euros, isZeroToTheCent, type Money, sum, toCents } from './money'

function loan(overrides: Partial<AmortiseInput> = {}): AmortiseInput {
  return {
    amount: euros(300_000),
    ratePercent: 3.8,
    years: 25,
    graceYears: 0,
    followupPeriods: [],
    fixedYears: 10,
    ...overrides,
  }
}

function closingBalance(input: AmortiseInput): Money {
  const schedule = amortise(input)
  return schedule.repayable.minus(sum(schedule.months.map((m) => m.principal)))
}

describe('annuity', () => {
  /* Expected values computed independently in Python, twice over — once with
   * decimal.Decimal at 40 digits and once in binary float — and both agree with each
   * other. The 200k/30y/6% case is additionally the figure published in every
   * textbook treatment of the annuity formula, 1199.10.
   *
   * These are not what this code returned. The first version of this test asserted a
   * recalled figure of 1548.10 and was wrong; the code was right. */
  it.each([
    { amount: 300_000, annualRate: '0.038', months: 300, expected: '1550.57' },
    { amount: 100_000, annualRate: '0.05', months: 120, expected: '1060.66' },
    { amount: 200_000, annualRate: '0.06', months: 360, expected: '1199.1' },
  ])('clears $amount over $months months', ({ amount, annualRate, months, expected }) => {
    const monthly = annuity(euros(amount), euros(annualRate).dividedBy(12), months)
    expect(toCents(monthly).toString()).toBe(expected)
  })

  it('splits the balance evenly when there is no interest', () => {
    expect(annuity(euros(120_000), euros(0), 240).equals(euros(500))).toBe(true)
  })

  it('is zero over no months rather than dividing by zero', () => {
    expect(annuity(euros(100_000), euros('0.003'), 0).isZero()).toBe(true)
  })

  it('rises as the term shortens', () => {
    const rate = euros('0.038').dividedBy(12)
    expect(annuity(euros(300_000), rate, 120).greaterThan(annuity(euros(300_000), rate, 300))).toBe(
      true,
    )
  })
})

describe('the schedule closes', () => {
  /* The test that catches drift. If the balance does not reach exactly zero, every
   * figure downstream — total interest, the ledger, the year chart — is wrong by
   * however much is left over. */
  it('leaves nothing outstanding across a spread of loans', () => {
    const cases: Partial<AmortiseInput>[] = [
      {},
      { amount: euros(1), ratePercent: 0.01, years: 5 },
      { amount: euros(2_000_000), ratePercent: 9.99, years: 35 },
      { amount: euros('123456.78'), ratePercent: 4.37, years: 17 },
      { amount: euros(100_000), ratePercent: 0, years: 20 },
      { amount: euros(250_000), ratePercent: 3.1, years: 30, graceYears: 5 },
      { amount: euros(180_000), ratePercent: 2.6, years: 25, graceYears: 2 },
      {
        amount: euros(400_000),
        ratePercent: 1.12,
        years: 30,
        followupPeriods: [
          { years: 10, ratePercent: 6.5 },
          { years: 10, ratePercent: 4.2 },
        ],
      },
      {
        amount: euros(150_000),
        ratePercent: 2.1,
        years: 35,
        graceYears: 3,
        followupPeriods: [{ years: 25, ratePercent: 8 }],
      },
    ]

    for (const [index, override] of cases.entries()) {
      expect(isZeroToTheCent(closingBalance(loan(override))), `case ${String(index)}`).toBe(true)
    }
  })

  it('repays exactly what was borrowed, to the cent', () => {
    const schedule = amortise(loan())
    const repaid = sum(schedule.months.map((m) => m.principal))
    expect(toCents(repaid).equals(toCents(schedule.repayable))).toBe(true)
  })

  it('reports the same interest it charges month by month', () => {
    const schedule = amortise(loan({ followupPeriods: [{ years: 15, ratePercent: 5.5 }] }))
    const charged = sum(schedule.months.map((m) => m.interest))
    expect(schedule.totalInterest.equals(charged)).toBe(true)
  })

  it('makes every payment the sum of its own two parts', () => {
    for (const month of amortise(loan({ graceYears: 2 })).months) {
      expect(month.payment.equals(month.principal.plus(month.interest))).toBe(true)
    }
  })
})

describe('grace periods', () => {
  it('takes nothing off the balance while they run', () => {
    const schedule = amortise(loan({ graceYears: 2 }))
    for (const month of schedule.months.slice(0, 24)) {
      expect(month.principal.isZero()).toBe(true)
      expect(month.interest.isZero()).toBe(false)
    }
    expect(schedule.months[24]?.principal.isZero()).toBe(false)
  })

  it('charges the same interest every month of the grace period', () => {
    const [first, second] = amortise(loan({ graceYears: 2 })).months
    expect(first?.interest.equals(second?.interest ?? euros(-1))).toBe(true)
  })

  it('raises the instalment afterwards, because the term is now shorter', () => {
    const without = amortise(loan()).firstRepayment
    const with2 = amortise(loan({ graceYears: 2 })).firstRepayment
    expect(with2.greaterThan(without)).toBe(true)
  })

  it('costs more interest overall, which is the trade', () => {
    expect(
      amortise(loan({ graceYears: 5 })).totalInterest.greaterThan(amortise(loan()).totalInterest),
    ).toBe(true)
  })

  it('clamps a grace period as long as the term instead of crashing', () => {
    const schedule = amortise(loan({ years: 10, graceYears: 10 }))
    expect(schedule.months).toHaveLength(120)
    expect(isZeroToTheCent(closingBalance(loan({ years: 10, graceYears: 10 })))).toBe(true)
    // One month of actual repayment survives at the end.
    expect(schedule.months[119]?.principal.isZero()).toBe(false)
  })

  it('clamps a grace period longer than the term too', () => {
    expect(isZeroToTheCent(closingBalance(loan({ years: 10, graceYears: 40 })))).toBe(true)
  })
})

describe('follow-up rate periods', () => {
  it('changes the payment at the end of the Zinsbindung, not before', () => {
    const schedule = amortise(loan({ followupPeriods: [{ years: 15, ratePercent: 8 }] }))
    expect(schedule.segments).toHaveLength(1)
    expect(schedule.segments[0]?.startMonth).toBe(120)
    expect(schedule.segments[0]?.ratePercent).toBe(8)
  })

  it('raises the payment when the new rate is higher', () => {
    const schedule = amortise(loan({ followupPeriods: [{ years: 15, ratePercent: 8 }] }))
    expect(schedule.segments[0]?.monthlyPayment.greaterThan(schedule.firstRepayment)).toBe(true)
  })

  it('lowers it when the new rate is lower', () => {
    const schedule = amortise(loan({ followupPeriods: [{ years: 15, ratePercent: 1 }] }))
    expect(schedule.segments[0]?.monthlyPayment.lessThan(schedule.firstRepayment)).toBe(true)
  })

  it('applies several in sequence from the end of the Zinsbindung', () => {
    const schedule = amortise(
      loan({
        years: 30,
        followupPeriods: [
          { years: 5, ratePercent: 6 },
          { years: 5, ratePercent: 7 },
        ],
      }),
    )
    expect(schedule.segments.map((s) => s.startMonth)).toEqual([120, 180])
  })

  /* A period that would begin after the loan is over describes nothing, and applying
   * it would re-amortise a balance that no longer exists. */
  it('ignores a period that starts after the loan has ended', () => {
    const schedule = amortise(
      loan({
        years: 10,
        followupPeriods: [{ years: 10, ratePercent: 9 }],
      }),
    )
    expect(schedule.segments).toHaveLength(0)
    expect(
      isZeroToTheCent(
        closingBalance(loan({ years: 10, followupPeriods: [{ years: 10, ratePercent: 9 }] })),
      ),
    ).toBe(true)
  })

  it('ignores one that would start during the grace period', () => {
    const schedule = amortise(loan({ graceYears: 12, years: 30, fixedYears: 10 }))
    expect(schedule.segments).toHaveLength(0)
  })

  it('re-amortises over the remaining term, not a fresh one', () => {
    // Ten years in, 15 remain. The new payment must clear the balance by year 25.
    const schedule = amortise(loan({ followupPeriods: [{ years: 15, ratePercent: 3.8 }] }))
    // At an unchanged rate, re-amortising over the remaining term changes nothing.
    expect(
      toCents(schedule.segments[0]?.monthlyPayment ?? euros(0)).equals(
        toCents(schedule.firstRepayment),
      ),
    ).toBe(true)
  })
})

describe('subsidy', () => {
  it('is a percentage of the loan, capped in absolute terms', () => {
    expect(subsidyFor(euros(150_000), 15, euros(22_500)).equals(euros(22_500))).toBe(true)
    expect(subsidyFor(euros(100_000), 10, euros(22_500)).equals(euros(10_000))).toBe(true)
    expect(subsidyFor(euros(150_000), 0, euros(22_500)).isZero()).toBe(true)
  })

  it('reduces what has to be repaid', () => {
    const schedule = amortise(loan({ amount: euros(150_000), subsidy: euros(22_500) }))
    expect(schedule.repayable.equals(euros(127_500))).toBe(true)
  })

  it('lowers both the payment and the lifetime interest', () => {
    const withSubsidy = amortise(loan({ amount: euros(150_000), subsidy: euros(22_500) }))
    const without = amortise(loan({ amount: euros(150_000) }))
    expect(withSubsidy.firstRepayment.lessThan(without.firstRepayment)).toBe(true)
    expect(withSubsidy.totalInterest.lessThan(without.totalInterest)).toBe(true)
  })

  it('never makes the repayable amount negative', () => {
    const schedule = amortise(loan({ amount: euros(10_000), subsidy: euros(50_000) }))
    expect(schedule.repayable.isZero()).toBe(true)
  })
})

describe('degenerate inputs', () => {
  it('produces at least one month for a zero-year term', () => {
    expect(amortise(loan({ years: 0 })).months.length).toBeGreaterThan(0)
  })

  it('charges no interest at all at a zero rate', () => {
    expect(amortise(loan({ ratePercent: 0 })).totalInterest.isZero()).toBe(true)
  })

  it('handles a zero-amount tranche without producing NaN', () => {
    const schedule = amortise(loan({ amount: euros(0) }))
    expect(schedule.totalInterest.isZero()).toBe(true)
    expect(schedule.firstRepayment.isZero()).toBe(true)
  })
})
