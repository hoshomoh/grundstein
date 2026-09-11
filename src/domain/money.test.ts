import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'

import {
  atLeastZero,
  equalToTheCent,
  euros,
  isZeroToTheCent,
  max,
  min,
  percentOf,
  sum,
  toCents,
  toNumber,
  ZERO,
} from './money'

describe('euros', () => {
  it('reads numbers, strings and other amounts alike', () => {
    expect(euros(1250.5).toString()).toBe('1250.5')
    expect(euros('1250.5').toString()).toBe('1250.5')
    expect(euros(euros(1250.5)).toString()).toBe('1250.5')
  })

  it('keeps full precision rather than rounding on construction', () => {
    expect(euros('0.123456789').toString()).toBe('0.123456789')
  })
})

describe('exactness', () => {
  /* The whole reason this module exists. In binary floating point 0.1 + 0.2 is
   * 0.30000000000000004, and a schedule does this kind of thing hundreds of times. */
  it('adds tenths exactly, where a float does not', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(euros('0.1').plus(euros('0.2')).equals(euros('0.3'))).toBe(true)
  })

  it('does not drift over hundreds of subtractions', () => {
    const instalment = euros('0.01')
    let balance = euros('4.20')
    for (let i = 0; i < 420; i++) balance = balance.minus(instalment)

    expect(balance.isZero()).toBe(true)

    let floatBalance = 4.2
    for (let i = 0; i < 420; i++) floatBalance -= 0.01
    expect(floatBalance).not.toBe(0)
  })
})

describe('toCents', () => {
  it('rounds half to even, so repeated rounding does not bias upward', () => {
    expect(toCents(euros('1.005')).toString()).toBe('1')
    expect(toCents(euros('1.015')).toString()).toBe('1.02')
    expect(toCents(euros('2.675')).toString()).toBe('2.68')
    expect(toCents(euros('2.665')).toString()).toBe('2.66')
  })

  it('leaves an amount that is already whole cents alone', () => {
    expect(toCents(euros('1250.49')).toString()).toBe('1250.49')
  })
})

describe('toNumber', () => {
  it('rounds to cents on the way out', () => {
    expect(toNumber(euros('1250.499'))).toBe(1250.5)
    expect(toNumber(euros('1250.494'))).toBe(1250.49)
  })

  it('survives an amount larger than any German property', () => {
    expect(toNumber(euros('150000000'))).toBe(150_000_000)
  })
})

describe('sum', () => {
  it('is zero for nothing', () => {
    expect(sum([]).equals(ZERO)).toBe(true)
  })

  it('adds the exact values, not their roundings', () => {
    const thirds = [euros('0.334'), euros('0.333'), euros('0.333')]
    expect(sum(thirds).equals(euros('1'))).toBe(true)
  })
})

describe('percentOf', () => {
  it('reads a percentage the way a person writes it', () => {
    // Grunderwerbsteuer in NRW on a 600,000 € purchase.
    expect(percentOf(euros(600_000), 6.5).equals(euros(39_000))).toBe(true)
  })

  it('handles the agent fee, which is not a round number', () => {
    expect(percentOf(euros(600_000), 3.57).equals(euros(21_420))).toBe(true)
  })

  it('is zero at zero percent', () => {
    expect(percentOf(euros(600_000), 0).isZero()).toBe(true)
  })
})

describe('bounds', () => {
  it('clamps negatives to zero', () => {
    expect(atLeastZero(euros(-1)).isZero()).toBe(true)
    expect(atLeastZero(euros(1)).equals(euros(1))).toBe(true)
  })

  it('picks the smaller and the larger', () => {
    expect(min(euros(3), euros(5)).equals(euros(3))).toBe(true)
    expect(max(euros(3), euros(5)).equals(euros(5))).toBe(true)
  })

  it('returns one of the two when they are equal', () => {
    expect(min(euros(3), euros(3)).equals(euros(3))).toBe(true)
    expect(max(euros(3), euros(3)).equals(euros(3))).toBe(true)
  })
})

describe('equalToTheCent', () => {
  it('ignores a difference smaller than a cent', () => {
    expect(equalToTheCent(euros('100.000000001'), euros('100'))).toBe(true)
  })

  it('does not ignore a whole cent', () => {
    expect(equalToTheCent(euros('100.01'), euros('100'))).toBe(false)
  })

  it('recognises a residue that is only a rounding artefact as zero', () => {
    expect(isZeroToTheCent(euros('0.0000001'))).toBe(true)
    expect(isZeroToTheCent(euros('0.01'))).toBe(false)
  })
})

describe('configuration', () => {
  it('is applied globally by importing this module', () => {
    expect(Decimal.rounding).toBe(Decimal.ROUND_HALF_EVEN)
    expect(Decimal.precision).toBe(34)
  })
})
