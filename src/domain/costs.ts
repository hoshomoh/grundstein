import { type Money, percentOf, sum } from './money'
import { stateByCode } from './states'
import type { FederalState, StateCode } from './types'

export type PurchaseCostsInput = {
  price: Money
  /** The part of the price the buyer covers themselves. */
  down: Money
  stateCode: StateCode
  notaryPercent: number
  registryPercent: number
  agentPercent: number
  agentInvolved: boolean
}

export type PurchaseCosts = {
  state: FederalState
  /** Grunderwerbsteuer — usually the largest single fee. */
  transferTax: Money
  notaryFee: Money
  registryFee: Money
  /** The buyer's half. Zero when no agent is involved. */
  agentFee: Money
  /** Every fee together, without the down payment. */
  closingCosts: Money
  /** Closing costs plus the down payment: what must be in the account on the day. */
  cashNeeded: Money
}

/**
 * What the purchase costs beyond the price itself.
 *
 * German banks lend against the property's value, and none of these fees are part of
 * that value — so all of them come out of savings. This is the distinction the whole
 * app exists to make plain: the down payment is not the cash you need.
 */
export function purchaseCosts(input: PurchaseCostsInput): PurchaseCosts {
  const state = stateByCode(input.stateCode)

  const transferTax = percentOf(input.price, state.transferTaxPercent)
  const notaryFee = percentOf(input.price, input.notaryPercent)
  const registryFee = percentOf(input.price, input.registryPercent)
  const agentFee = input.agentInvolved
    ? percentOf(input.price, input.agentPercent)
    : percentOf(input.price, 0)

  const closingCosts = sum([transferTax, notaryFee, registryFee, agentFee])

  return {
    state,
    transferTax,
    notaryFee,
    registryFee,
    agentFee,
    closingCosts,
    cashNeeded: closingCosts.plus(input.down),
  }
}

/** Closing costs as a share of the price, for the "5 to 12 percent" copy. */
export function closingCostsPercent(costs: PurchaseCosts, price: Money): number {
  if (price.isZero()) return 0
  return costs.closingCosts.dividedBy(price).times(100).toNumber()
}
