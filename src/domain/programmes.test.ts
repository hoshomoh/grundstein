import { describe, expect, it } from 'vitest'

import { euros } from './money'
import {
  highestCeiling,
  maxLoanFor,
  PROGRAMME_ORDER,
  PROGRAMMES,
  CATALOGUE_VERIFIED_ON,
} from './programmes'
import type { EnergyTarget, Profile, Programme } from './types'

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

function programme(key: string): Programme {
  const found = PROGRAMMES[key]
  if (!found) throw new Error(`no programme ${key}`)
  return found
}

describe('the catalogue', () => {
  it('lists every ordered key and orders every listed key', () => {
    expect([...PROGRAMME_ORDER].sort()).toEqual(Object.keys(PROGRAMMES).sort())
  })

  it('gives every programme a key matching its entry', () => {
    for (const [key, p] of Object.entries(PROGRAMMES)) expect(p.key).toBe(key)
  })

  it('dates every figure it carries', () => {
    for (const p of Object.values(PROGRAMMES)) {
      expect(p.provenance.verifiedOn).toBe(CATALOGUE_VERIFIED_ON)
    }
  })

  it('gives every KfW programme a source, and marks ours as ours', () => {
    for (const p of Object.values(PROGRAMMES)) {
      if (p.isKfw) expect(p.provenance.source).toMatch(/^https:\/\/www\.kfw\.de\//)
      else expect(p.provenance.source).toBeNull()
    }
  })

  it('says in writing that 270s ceiling is ours rather than KfWs', () => {
    expect(programme('270').provenance.note).toMatch(/is ours/)
  })
})

describe('exclusions', () => {
  /* If A cannot fund the same home as B, then B cannot fund the same home as A. The
   * conflict detector relies on this, and a one-sided entry would hide a real clash. */
  it('are symmetric in both directions', () => {
    for (const p of Object.values(PROGRAMMES)) {
      for (const otherKey of p.excludes) {
        const other = programme(otherKey)
        const mutual = other.excludes.includes(p.key) || p.excludes.includes(other.key)
        expect(mutual, `${p.key} ↔ ${otherKey}`).toBe(true)
      }
    }
  })

  it('never name a programme that does not exist', () => {
    for (const p of Object.values(PROGRAMMES)) {
      for (const key of p.excludes) expect(Object.keys(PROGRAMMES)).toContain(key)
    }
  })

  it('never exclude themselves', () => {
    for (const p of Object.values(PROGRAMMES)) expect(p.excludes).not.toContain(p.key)
  })
})

describe('verified figures', () => {
  it('keeps KfW 297 and 298 at 100k and 150k', () => {
    expect(maxLoanFor(programme('297').ceiling, profile()).equals(euros(100_000))).toBe(true)
    expect(maxLoanFor(programme('298').ceiling, profile()).equals(euros(150_000))).toBe(true)
  })

  it('accepts EH55 for KfW 297, which the prototype wrongly refused', () => {
    expect(programme('297').energyTargets).toContain('eh55')
  })

  it('caps 261 and 270 at 30 years and everything else at 35', () => {
    expect(programme('261').maxYears).toBe(30)
    expect(programme('270').maxYears).toBe(30)
    expect(programme('297').maxYears).toBe(35)
    expect(programme('300').maxYears).toBe(35)
  })

  it('asks KfW 270 applicants to feed the grid, and nobody else', () => {
    for (const p of Object.values(PROGRAMMES)) {
      expect(p.requiresGridFeed, p.key).toBe(p.key === '270')
    }
  })

  it('pays a Tilgungszuschuss on 261 and on nothing else', () => {
    for (const p of Object.values(PROGRAMMES)) {
      expect(p.subsidy !== null, p.key).toBe(p.key === '261')
    }

    const subsidy = programme('261').subsidy
    expect(subsidy?.maxAmount.equals(euros(22_500))).toBe(true)
    expect(subsidy?.percentByEnergyTarget.qng).toBe(15)
    expect(subsidy?.percentByEnergyTarget.eh40).toBe(10)
    expect(subsidy?.worstPerformingBuildingBonusPercent).toBe(10)
  })

  it('raises the income cap by 10,000 € per child beyond the first', () => {
    for (const key of ['300', '308']) {
      expect(programme(key).incomeCap?.equals(euros(90_000))).toBe(true)
      expect(programme(key).incomeCapPerExtraChild.equals(euros(10_000))).toBe(true)
    }
  })
})

describe('maxLoanFor — KfW 300, a children × QNG grid', () => {
  const ceiling = programme('300').ceiling

  function ceilingAt(children: number, energy: EnergyTarget) {
    return maxLoanFor(ceiling, profile({ children, energy }))
  }

  it('offers nothing to a household with no children', () => {
    expect(ceilingAt(0, 'eh40').isZero()).toBe(true)
  })

  it('holds 170k across the first tier and steps at the third child', () => {
    expect(ceilingAt(1, 'eh40').equals(euros(170_000))).toBe(true)
    expect(ceilingAt(2, 'eh40').equals(euros(170_000))).toBe(true)
    expect(ceilingAt(3, 'eh40').equals(euros(200_000))).toBe(true)
  })

  it('steps again at the fifth child and stays there', () => {
    expect(ceilingAt(4, 'eh40').equals(euros(200_000))).toBe(true)
    expect(ceilingAt(5, 'eh40').equals(euros(220_000))).toBe(true)
    expect(ceilingAt(9, 'eh40').equals(euros(220_000))).toBe(true)
  })

  it('lifts every tier when the household targets QNG', () => {
    expect(ceilingAt(1, 'qng').equals(euros(220_000))).toBe(true)
    expect(ceilingAt(3, 'qng').equals(euros(250_000))).toBe(true)
    expect(ceilingAt(5, 'qng').equals(euros(270_000))).toBe(true)
  })

  /* The bug this whole mechanism exists to prevent: a flat 270,000 € cap let a
   * one-child household slide to an amount only a five-child household with QNG
   * can borrow, and quoted them a monthly payment for it. */
  it('does not offer a one-child household the five-child amount', () => {
    expect(ceilingAt(1, 'eh40').lessThan(euros(270_000))).toBe(true)
  })
})

describe('maxLoanFor — KfW 308, a grid with no QNG dimension', () => {
  const ceiling = programme('308').ceiling

  it('steps at every child up to the third', () => {
    expect(maxLoanFor(ceiling, profile({ children: 1 })).equals(euros(140_000))).toBe(true)
    expect(maxLoanFor(ceiling, profile({ children: 2 })).equals(euros(160_000))).toBe(true)
    expect(maxLoanFor(ceiling, profile({ children: 3 })).equals(euros(180_000))).toBe(true)
    expect(maxLoanFor(ceiling, profile({ children: 6 })).equals(euros(180_000))).toBe(true)
  })

  it('ignores QNG, which this programme does not reward', () => {
    const standard = maxLoanFor(ceiling, profile({ children: 2, energy: 'eh85' }))
    const withQng = maxLoanFor(ceiling, profile({ children: 2, energy: 'qng' }))
    expect(standard.equals(withQng)).toBe(true)
  })

  /* The prototype carried 100/125/150k. Every tier has risen by 30–40k since, so a
   * three-child household was being offered 30,000 € less than it can have. */
  it('is above the prototypes figure at every tier', () => {
    const prototype = [euros(100_000), euros(125_000), euros(150_000)]
    for (const [index, was] of prototype.entries()) {
      const now = maxLoanFor(ceiling, profile({ children: index + 1 }))
      expect(now.greaterThan(was), `tier ${String(index + 1)}`).toBe(true)
    }
  })
})

describe('highestCeiling', () => {
  it('is the amount itself for a flat ceiling', () => {
    expect(highestCeiling(programme('124').ceiling).equals(euros(100_000))).toBe(true)
  })

  it('is the best cell of the grid for a tiered one', () => {
    expect(highestCeiling(programme('300').ceiling).equals(euros(270_000))).toBe(true)
    expect(highestCeiling(programme('308').ceiling).equals(euros(180_000))).toBe(true)
  })

  it('is never below what any household could actually be offered', () => {
    for (const p of Object.values(PROGRAMMES)) {
      const best = highestCeiling(p.ceiling)
      for (const children of [0, 1, 2, 3, 4, 5, 8]) {
        for (const energy of ['none', 'eh85', 'eh55', 'eh40', 'qng'] as const) {
          const offered = maxLoanFor(p.ceiling, profile({ children, energy }))
          expect(offered.greaterThan(best), `${p.key} ${String(children)} ${energy}`).toBe(false)
        }
      }
    }
  })
})
