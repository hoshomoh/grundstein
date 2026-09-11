import Decimal from 'decimal.js'

/* The one place decimal.js is configured, and the one place it is imported — the lint
 * config forbids `decimal.js` everywhere else, so these settings cannot be quietly
 * changed under a calculation that depends on them.
 *
 * ROUND_HALF_EVEN because a schedule rounds hundreds of instalments: always rounding
 * half away from zero biases every one of them upward, and over 420 months that bias
 * is money. Half-even has no such drift, and it is what German lenders use.
 *
 * 34 significant digits is far more than a 35-year monthly schedule needs. The cost of
 * the headroom is nothing; the cost of running out is a balance that does not close. */
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN })

/** A euro amount. Never a `number` — see STANDARDS.md §4. */
export type Money = Decimal

/** Anything that can be read as an amount: a number, a numeric string, or a Money. */
export type MoneyInput = Decimal.Value

export const ZERO: Money = new Decimal(0)

/** Build an amount. Full precision is kept; rounding happens at the edges, not here. */
export function euros(value: MoneyInput): Money {
  return new Decimal(value)
}

/** Round to whole cents. The only rounding the domain performs. */
export function toCents(amount: Money): Money {
  return amount.toDecimalPlaces(2)
}

/**
 * Leave the decimal world.
 *
 * This is the single boundary between exact arithmetic and the `number`s that
 * formatting, chart geometry and React props are made of. Nothing downstream may add
 * two of these together and call the result money.
 */
export function toNumber(amount: Money): number {
  return toCents(amount).toNumber()
}

/** Add a list of amounts. Exact: the result is the sum, not a sum of roundings. */
export function sum(amounts: readonly Money[]): Money {
  return amounts.reduce<Money>((total, amount) => total.plus(amount), ZERO)
}

/**
 * A percentage of an amount, where `percent` is written as people write it: `6.5`
 * means 6.5%, not 0.065.
 */
export function percentOf(amount: Money, percent: MoneyInput): Money {
  return amount.times(percent).dividedBy(100)
}

/** Clamp to zero. Negative money is never shown to anyone (STANDARDS.md §4). */
export function atLeastZero(amount: Money): Money {
  return amount.isNegative() ? ZERO : amount
}

/** The smaller of two amounts. */
export function min(a: Money, b: Money): Money {
  return a.lessThan(b) ? a : b
}

/** The larger of two amounts. */
export function max(a: Money, b: Money): Money {
  return a.greaterThan(b) ? a : b
}

/**
 * Whether two amounts are equal once rounded to cents.
 *
 * Used by the cover indicator and by the tests that assert a schedule closes: a
 * balance of 0.000000001 € is zero to anyone who is not a computer.
 */
export function equalToTheCent(a: Money, b: Money): boolean {
  return toCents(a).equals(toCents(b))
}

/** True when the amount is zero to the cent. */
export function isZeroToTheCent(amount: Money): boolean {
  return toCents(amount).isZero()
}
