import { atLeastZero, euros, min, type Money, sum, ZERO } from './money'
import type { FollowupPeriod } from './types'

const MONTHS_PER_YEAR = 12
const ONE = euros(1)

export type ScheduleMonth = {
  /** The part of the payment that reduces the balance. Zero during grace. */
  principal: Money
  interest: Money
  payment: Money
}

/** A stretch of the schedule at one rate, and what the payment becomes there. */
export type RateSegment = {
  /** Months from the start of the loan. */
  startMonth: number
  ratePercent: number
  monthlyPayment: Money
}

export type Schedule = {
  months: readonly ScheduleMonth[]
  /** The instalment once repayment begins — the figure a borrower plans around. */
  firstRepayment: Money
  /** What the payment becomes after each follow-up rate change. */
  segments: readonly RateSegment[]
  totalInterest: Money
  /** What was actually borrowed, after any Tilgungszuschuss. */
  repayable: Money
}

export type AmortiseInput = {
  amount: Money
  ratePercent: number
  years: number
  graceYears: number
  followupPeriods: readonly FollowupPeriod[]
  /** When follow-up rates start applying — the end of the Zinsbindung. */
  fixedYears: number
  /** A Tilgungszuschuss, which reduces what has to be repaid. */
  subsidy?: Money
}

/**
 * The constant monthly payment that clears `balance` over `months` at `monthlyRate`.
 *
 * The one formula the whole app rests on:  b · r · (1+r)ⁿ ⁄ ((1+r)ⁿ − 1)
 */
export function annuity(balance: Money, monthlyRate: Money, months: number): Money {
  if (months <= 0) return ZERO
  // An interest-free loan is just the balance split evenly. Without this the formula
  // divides by zero.
  if (monthlyRate.isZero()) return balance.dividedBy(months)

  const growth = ONE.plus(monthlyRate).pow(months)
  return balance.times(monthlyRate).times(growth).dividedBy(growth.minus(ONE))
}

/** A yearly percentage as the monthly decimal the schedule works in. */
function monthlyRateOf(ratePercent: number): Money {
  return euros(ratePercent).dividedBy(100).dividedBy(MONTHS_PER_YEAR)
}

function monthsOf(years: number): number {
  return Math.max(1, Math.round(years * MONTHS_PER_YEAR))
}

type Boundary = {
  month: number
  monthlyRate: Money
  ratePercent: number
}

/**
 * The months at which the rate changes, in order.
 *
 * The first is where repayment begins — the end of the grace period. The rest come
 * from the follow-up periods, which run consecutively from the end of the Zinsbindung.
 * A period that would begin after the loan has ended is dropped rather than applied.
 */
function rateBoundaries(
  input: AmortiseInput,
  totalMonths: number,
  graceMonths: number,
): Boundary[] {
  const boundaries: Boundary[] = [
    {
      month: graceMonths,
      monthlyRate: monthlyRateOf(input.ratePercent),
      ratePercent: input.ratePercent,
    },
  ]

  let month = monthsOf(input.fixedYears)
  for (const period of input.followupPeriods) {
    if (month > graceMonths && month < totalMonths) {
      boundaries.push({
        month,
        monthlyRate: monthlyRateOf(period.ratePercent),
        ratePercent: period.ratePercent,
      })
    }
    month += monthsOf(period.years)
  }

  return boundaries
}

/**
 * Month-by-month principal, interest and payment for one tranche.
 *
 * Two details decide whether the numbers are trustworthy:
 *
 * The **final instalment absorbs the remainder**. The annuity formula closes a balance
 * exactly in exact arithmetic, but `pow` rounds at the 34th digit, so the last month
 * would otherwise leave a residue of about 1e-30 €. Making the last principal equal
 * whatever is left means the instalments sum to the amount borrowed exactly — which is
 * also what a lender does.
 *
 * A **rate change re-amortises the remaining balance over the remaining term**. The
 * payment after year ten is whatever clears what is left by the original end date, not
 * a recalculation over a fresh full term.
 */
export function amortise(input: AmortiseInput): Schedule {
  const totalMonths = monthsOf(input.years)
  // A grace period as long as the term would leave nothing to repay it with.
  const graceMonths = Math.max(0, Math.min(monthsOf(input.graceYears), totalMonths - 1))

  const repayable = atLeastZero(input.amount.minus(input.subsidy ?? ZERO))
  const boundaries = rateBoundaries(input, totalMonths, graceMonths)

  const months: ScheduleMonth[] = []
  let balance = repayable
  let monthlyRate = boundaries[0]?.monthlyRate ?? ZERO
  let payment = ZERO
  let nextBoundary = 0
  let firstRepayment = ZERO
  const segments: RateSegment[] = []

  for (let month = 0; month < totalMonths; month++) {
    // Grace: interest only, nothing comes off the balance.
    if (month < graceMonths) {
      const interest = balance.times(monthlyRate)
      months.push({ principal: ZERO, interest, payment: interest })
      continue
    }

    const boundary = boundaries[nextBoundary]
    if (boundary?.month === month) {
      monthlyRate = boundary.monthlyRate
      payment = annuity(balance, monthlyRate, totalMonths - month)
      if (nextBoundary === 0) firstRepayment = payment
      else
        segments.push({
          startMonth: month,
          ratePercent: boundary.ratePercent,
          monthlyPayment: payment,
        })
      nextBoundary++
    }

    const interest = balance.times(monthlyRate)
    const isLastMonth = month === totalMonths - 1
    const principal = isLastMonth ? balance : min(payment.minus(interest), balance)

    months.push({ principal, interest, payment: principal.plus(interest) })
    balance = balance.minus(principal)
  }

  return {
    months,
    firstRepayment,
    segments,
    totalInterest: sum(months.map((m) => m.interest)),
    repayable,
  }
}

/** The Tilgungszuschuss a loan earns, capped both proportionally and absolutely. */
export function subsidyFor(amount: Money, percent: number, maxAmount: Money): Money {
  if (percent <= 0) return ZERO
  return min(amount.times(percent).dividedBy(100), maxAmount)
}
