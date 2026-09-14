import { amortise, type RateSegment, type ScheduleMonth, subsidyFor } from './amortisation'
import { atLeastZero, euros, max, type Money, sum, ZERO } from './money'
import { drawableAmount } from './programmes'
import type { Profile, Programme, ProgrammeKey, Tranche } from './types'

const MONTHS_PER_YEAR = 12

/** One tranche's contribution, with everything the ledger and the cards need. */
export type PortfolioRow = {
  trancheId: number
  programmeKey: ProgrammeKey
  name: string
  /** What was borrowed, before any Tilgungszuschuss — capped by the household's ceiling. */
  amount: Money
  /** What the reader asked for. Above `amount` when their answers lowered the ceiling. */
  requested: Money
  /** What has to be repaid, after it. */
  repayable: Money
  subsidy: Money
  ratePercent: number
  years: number
  graceYears: number
  firstRepayment: Money
  segments: readonly RateSegment[]
  totalInterest: Money
}

export type YearTotals = {
  principal: Money
  interest: Money
}

export type Portfolio = {
  rows: readonly PortfolioRow[]
  /** Every tranche's schedule summed, month by month. */
  months: readonly ScheduleMonth[]
  yearly: readonly YearTotals[]
  totalBorrowed: Money
  totalInterest: Money
  /**
   * The highest monthly total anywhere in the schedule.
   *
   * This is the headline figure, not the first payment. With a grace period the first
   * payment understates what the household has to be able to afford, and the whole
   * point of the page is to not understate that.
   */
  peakPayment: Money
  /** The amount-weighted average rate, for the "blended" line in the ledger. */
  blendedRatePercent: number
}

/** The Tilgungszuschuss this tranche earns, given the household's energy target. */
export function subsidyForTranche(
  tranche: Tranche,
  programme: Programme | undefined,
  profile: Profile,
): Money {
  if (!programme?.subsidy) return ZERO

  const percent = programme.subsidy.percentByEnergyTarget[profile.energy]
  return subsidyFor(tranche.amount, percent, programme.subsidy.maxAmount)
}

/**
 * Every tranche's schedule, summed into one household's borrowing.
 *
 * A tranche set to zero contributes nothing and is left out of the rows entirely —
 * it is not funding anything, so it has no schedule and does not belong in the ledger.
 */
export function buildPortfolio(
  tranches: readonly Tranche[],
  programmes: Readonly<Record<ProgrammeKey, Programme>>,
  profile: Profile,
): Portfolio {
  const rows: PortfolioRow[] = []
  const allSchedules: (readonly ScheduleMonth[])[] = []

  for (const tranche of tranches) {
    const programme = programmes[tranche.programmeKey]
    const amount = drawableAmount(tranche.amount, programme, profile)
    if (!amount.greaterThan(0)) continue

    const subsidy = subsidyForTranche({ ...tranche, amount }, programme, profile)

    const schedule = amortise({
      amount,
      ratePercent: tranche.ratePercent,
      years: tranche.years,
      graceYears: tranche.graceYears,
      followupPeriods: tranche.followupPeriods,
      fixedYears: programme?.zinsbindungYears ?? 10,
      subsidy,
    })

    allSchedules.push(schedule.months)
    rows.push({
      trancheId: tranche.id,
      programmeKey: tranche.programmeKey,
      name: tranche.name,
      amount,
      requested: tranche.amount,
      repayable: schedule.repayable,
      subsidy,
      ratePercent: tranche.ratePercent,
      years: tranche.years,
      graceYears: tranche.graceYears,
      firstRepayment: schedule.firstRepayment,
      segments: schedule.segments,
      totalInterest: schedule.totalInterest,
    })
  }

  const months = mergeSchedules(allSchedules)

  const totalBorrowed = sum(rows.map((row) => row.amount))
  const weighted = rows.reduce<Money>(
    (total, row) => total.plus(row.amount.times(row.ratePercent)),
    ZERO,
  )

  return {
    rows,
    months,
    yearly: byYear(months),
    totalBorrowed,
    totalInterest: sum(rows.map((row) => row.totalInterest)),
    peakPayment: months.reduce<Money>((highest, month) => max(highest, month.payment), ZERO),
    blendedRatePercent: totalBorrowed.isZero()
      ? 0
      : weighted.dividedBy(totalBorrowed).toDecimalPlaces(4).toNumber(),
  }
}

/**
 * Add schedules of different lengths together.
 *
 * The household's payment in month 200 is whatever every loan still running then
 * charges, so the merged schedule is as long as the longest tranche and the shorter
 * ones simply stop contributing.
 */
function mergeSchedules(schedules: readonly (readonly ScheduleMonth[])[]): ScheduleMonth[] {
  const longest = schedules.reduce((most, schedule) => Math.max(most, schedule.length), 0)
  const merged: ScheduleMonth[] = []

  for (let month = 0; month < longest; month++) {
    let principal = ZERO
    let interest = ZERO
    let payment = ZERO

    for (const schedule of schedules) {
      const entry = schedule[month]
      if (!entry) continue

      principal = principal.plus(entry.principal)
      interest = interest.plus(entry.interest)
      payment = payment.plus(entry.payment)
    }

    merged.push({ principal, interest, payment })
  }

  return merged
}

/** The month-by-month schedule collapsed into calendar years, for the chart. */
export function byYear(months: readonly ScheduleMonth[]): YearTotals[] {
  const years: YearTotals[] = []

  for (let index = 0; index < months.length; index++) {
    const month = months[index]
    if (!month) continue

    const year = Math.floor(index / MONTHS_PER_YEAR)
    const totals = years[year] ?? { principal: ZERO, interest: ZERO }
    years[year] = {
      principal: totals.principal.plus(month.principal),
      interest: totals.interest.plus(month.interest),
    }
  }

  return years
}

/** The twelve months of one year, for the drill-down. */
export function monthsOfYear(
  months: readonly ScheduleMonth[],
  year: number,
): readonly ScheduleMonth[] {
  const start = year * MONTHS_PER_YEAR
  return months.slice(start, start + MONTHS_PER_YEAR)
}

export type Cover = {
  /** What the tranches add up to, against what the purchase still needs. */
  difference: Money
  status: 'covered' | 'short' | 'over'
}

/**
 * What the loans have to cover: the price less the buyer's own money.
 *
 * Named once and shared, because the suggester and the cover line must agree on it —
 * a package built against one definition and judged against another would report
 * itself short.
 */
export function fundingNeeded(price: Money, down: Money): Money {
  return atLeastZero(price.minus(down))
}

/** Whether the borrowing covers the price less the down payment. */
export function coverOf(totalBorrowed: Money, price: Money, down: Money): Cover {
  const needed = fundingNeeded(price, down)
  const difference = totalBorrowed.minus(needed)

  if (difference.abs().lessThan(euros(1))) return { difference: ZERO, status: 'covered' }
  return {
    difference: difference.abs(),
    status: difference.greaterThan(0) ? 'over' : 'short',
  }
}
