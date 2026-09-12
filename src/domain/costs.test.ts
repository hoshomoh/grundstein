import { describe, expect, it } from 'vitest'

import { closingCostsPercent, purchaseCosts, type PurchaseCostsInput } from './costs'
import { euros, sum, toCents } from './money'

function purchase(overrides: Partial<PurchaseCostsInput> = {}): PurchaseCostsInput {
  return {
    price: euros(600_000),
    down: euros(100_000),
    stateCode: 'BY',
    notaryPercent: 1.5,
    registryPercent: 0.5,
    agentPercent: 3.57,
    agentInvolved: true,
    ...overrides,
  }
}

describe('purchaseCosts', () => {
  /* Worked by hand on a 600,000 € purchase in Bayern (3.5%):
   *   transfer 21,000 · notary 9,000 · registry 3,000 · agent 21,420
   *   closing  54,420 · cash needed 154,420 with a 100,000 € down payment */
  it('computes each fee from the price', () => {
    const costs = purchaseCosts(purchase())
    expect(costs.transferTax.equals(euros(21_000))).toBe(true)
    expect(costs.notaryFee.equals(euros(9_000))).toBe(true)
    expect(costs.registryFee.equals(euros(3_000))).toBe(true)
    expect(costs.agentFee.equals(euros(21_420))).toBe(true)
    expect(costs.closingCosts.equals(euros(54_420))).toBe(true)
    expect(costs.cashNeeded.equals(euros(154_420))).toBe(true)
  })

  it('adds the down payment to the fees, to the cent', () => {
    const costs = purchaseCosts(purchase({ price: euros('333333.33'), down: euros('77777.77') }))
    const expected = costs.closingCosts.plus(euros('77777.77'))
    expect(toCents(costs.cashNeeded).equals(toCents(expected))).toBe(true)
  })

  it('makes the closing total the sum of its own parts', () => {
    const costs = purchaseCosts(purchase())
    const parts = sum([costs.transferTax, costs.notaryFee, costs.registryFee, costs.agentFee])
    expect(costs.closingCosts.equals(parts)).toBe(true)
  })

  it('charges no agent fee when no agent is involved', () => {
    const costs = purchaseCosts(purchase({ agentInvolved: false }))
    expect(costs.agentFee.isZero()).toBe(true)
    expect(costs.closingCosts.equals(euros(33_000))).toBe(true)
  })

  it('uses the buyers own state, not a default', () => {
    const bayern = purchaseCosts(purchase({ stateCode: 'BY' }))
    const nrw = purchaseCosts(purchase({ stateCode: 'NW' }))
    expect(bayern.transferTax.equals(euros(21_000))).toBe(true)
    expect(nrw.transferTax.equals(euros(39_000))).toBe(true)
    expect(nrw.state.name).toBe('Nordrhein-Westfalen')
  })

  /* The spread the design puts in front of the buyer: the same house costs 18,000 €
   * more to buy in NRW than in Bayern, before anyone has borrowed anything. */
  it('shows the full spread between the cheapest and dearest state', () => {
    const cheapest = purchaseCosts(purchase({ stateCode: 'BY' })).transferTax
    const dearest = purchaseCosts(purchase({ stateCode: 'NW' })).transferTax
    expect(dearest.minus(cheapest).equals(euros(18_000))).toBe(true)
  })

  it('is all zero at a zero price', () => {
    const costs = purchaseCosts(purchase({ price: euros(0), down: euros(0) }))
    expect(costs.closingCosts.isZero()).toBe(true)
    expect(costs.cashNeeded.isZero()).toBe(true)
  })
})

describe('closingCostsPercent', () => {
  it('lands in the 5 to 12 percent band the copy promises', () => {
    const withAgent = purchaseCosts(purchase())
    const withoutAgent = purchaseCosts(purchase({ agentInvolved: false }))

    expect(closingCostsPercent(withoutAgent, euros(600_000))).toBeCloseTo(5.5, 5)
    expect(closingCostsPercent(withAgent, euros(600_000))).toBeCloseTo(9.07, 2)
  })

  it('is zero rather than NaN at a zero price', () => {
    const costs = purchaseCosts(purchase({ price: euros(0) }))
    expect(closingCostsPercent(costs, euros(0))).toBe(0)
  })
})
