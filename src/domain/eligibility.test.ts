import { describe, expect, it } from 'vitest'

import {
  checkEligibility,
  excludedProgrammes,
  findConflicts,
  incomeLimitFor,
  trancheIdsInConflict,
} from './eligibility'
import { euros } from './money'
import { PROGRAMMES } from './programmes'
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

function programme(key: string): Programme {
  const found = PROGRAMMES[key]
  if (!found) throw new Error(`no programme ${key}`)
  return found
}

function tranche(id: number, programmeKey: ProgrammeKey, amount = euros(100_000)): Tranche {
  return {
    id,
    programmeKey,
    name: programmeKey,
    amount,
    ratePercent: 3,
    years: 25,
    graceYears: 0,
    followupPeriods: [],
  }
}

function reasonKinds(p: Programme, prof: Profile): string[] {
  return checkEligibility(p, prof).reasons.map((r) => r.kind)
}

describe('incomeLimitFor', () => {
  it('is 90,000 € for one child', () => {
    expect(incomeLimitFor(programme('300'), profile({ children: 1 }))?.equals(euros(90_000))).toBe(
      true,
    )
  })

  it('rises by 10,000 € for each child beyond the first', () => {
    expect(incomeLimitFor(programme('300'), profile({ children: 2 }))?.equals(euros(100_000))).toBe(
      true,
    )
    expect(incomeLimitFor(programme('300'), profile({ children: 4 }))?.equals(euros(120_000))).toBe(
      true,
    )
  })

  it('does not fall below the base for a childless household', () => {
    expect(incomeLimitFor(programme('300'), profile({ children: 0 }))?.equals(euros(90_000))).toBe(
      true,
    )
  })

  it('is absent where the programme sets no income test', () => {
    expect(incomeLimitFor(programme('124'), profile())).toBeNull()
  })
})

describe('checkEligibility', () => {
  it('passes a household that meets every condition', () => {
    expect(checkEligibility(programme('300'), profile()).ok).toBe(true)
  })

  it('refuses a project type the programme does not cover', () => {
    expect(reasonKinds(programme('300'), profile({ projectType: 'renovate' }))).toContain(
      'projectType',
    )
  })

  it('refuses a childless household where a child is required', () => {
    expect(reasonKinds(programme('300'), profile({ children: 0 }))).toContain('needsChild')
  })

  it('refuses an income above the limit, and allows one exactly on it', () => {
    // Two children, so the limit is 100,000 €.
    expect(reasonKinds(programme('300'), profile({ income: euros(100_001) }))).toContain(
      'incomeAboveLimit',
    )
    expect(reasonKinds(programme('300'), profile({ income: euros(100_000) }))).not.toContain(
      'incomeAboveLimit',
    )
  })

  it('refuses an existing owner where the programme excludes them', () => {
    expect(reasonKinds(programme('300'), profile({ ownsHome: true }))).toContain('alreadyOwns')
    expect(reasonKinds(programme('124'), profile({ ownsHome: true }))).not.toContain('alreadyOwns')
  })

  it('refuses an energy target the programme does not accept', () => {
    expect(reasonKinds(programme('298'), profile({ energy: 'eh55' }))).toContain('energyTarget')
  })

  /* The bug the verification found: EH55 is now a valid tier for 297, and the
   * prototype told those households they did not qualify. */
  it('accepts EH55 for KfW 297', () => {
    expect(checkEligibility(programme('297'), profile({ energy: 'eh55' })).ok).toBe(true)
  })

  it('does not punish a household that has not chosen an energy target yet', () => {
    expect(reasonKinds(programme('298'), profile({ energy: 'none' }))).not.toContain('energyTarget')
  })

  it('refuses KfW 270 to someone who does not feed the grid', () => {
    expect(reasonKinds(programme('270'), profile({ feedsGrid: false }))).toContain('needsGridFeed')
    expect(reasonKinds(programme('270'), profile({ feedsGrid: true }))).not.toContain(
      'needsGridFeed',
    )
  })

  it('asks nobody else about the grid', () => {
    for (const key of ['297', '298', '300', '308', '124', '261', 'bank']) {
      expect(reasonKinds(programme(key), profile({ feedsGrid: false }))).not.toContain(
        'needsGridFeed',
      )
    }
  })

  /* Reporting one reason at a time sends a household round in circles: they fix the
   * income, come back, and are told about the children. */
  it('reports every failing condition at once, not just the first', () => {
    const kinds = reasonKinds(
      programme('300'),
      profile({ projectType: 'renovate', children: 0, income: euros(500_000), ownsHome: true }),
    )
    expect(kinds).toContain('projectType')
    expect(kinds).toContain('needsChild')
    expect(kinds).toContain('incomeAboveLimit')
    expect(kinds).toContain('alreadyOwns')
  })

  it('carries the actual limit in the reason, so the copy can name it', () => {
    const reason = checkEligibility(
      programme('300'),
      profile({ children: 3, income: euros(999_999) }),
    ).reasons.find((r) => r.kind === 'incomeAboveLimit')

    expect(reason?.kind === 'incomeAboveLimit' && reason.limit.equals(euros(110_000))).toBe(true)
  })

  it('lets the bank loan through for anyone', () => {
    expect(checkEligibility(programme('bank'), profile({ ownsHome: true, children: 0 })).ok).toBe(
      true,
    )
  })
})

describe('excludedProgrammes', () => {
  it('reads the exclusion from whichever side declares it', () => {
    // 308 declares it excludes 300; 300 does not declare 308.
    expect(excludedProgrammes('308', PROGRAMMES)).toContain('300')
    expect(excludedProgrammes('300', PROGRAMMES)).toContain('308')
  })

  it('never lists a programme twice', () => {
    for (const key of Object.keys(PROGRAMMES)) {
      const excluded = excludedProgrammes(key, PROGRAMMES)
      expect(new Set(excluded).size).toBe(excluded.length)
    }
  })

  it('never lists the programme itself', () => {
    for (const key of Object.keys(PROGRAMMES)) {
      expect(excludedProgrammes(key, PROGRAMMES)).not.toContain(key)
    }
  })

  it('is empty for the programmes that pair with everything', () => {
    expect(excludedProgrammes('124', PROGRAMMES)).toEqual([])
    expect(excludedProgrammes('270', PROGRAMMES)).toEqual([])
    expect(excludedProgrammes('bank', PROGRAMMES)).toEqual([])
  })
})

describe('findConflicts', () => {
  it('finds nothing among programmes that pair happily', () => {
    expect(findConflicts([tranche(1, '124'), tranche(2, 'bank')], PROGRAMMES)).toEqual([])
  })

  it('finds a clash between 300 and 297', () => {
    const conflicts = findConflicts([tranche(1, '300'), tranche(2, '297')], PROGRAMMES)
    expect(conflicts).toHaveLength(1)
    expect([conflicts[0]?.a, conflicts[0]?.b].sort()).toEqual(['297', '300'])
    expect([...(conflicts[0]?.trancheIds ?? [])].sort()).toEqual([1, 2])
  })

  /* Symmetry matters: 308 declares it excludes 300 and 300 says nothing about 308.
   * A one-directional check would miss this pair entirely. */
  it('finds a clash declared by only one of the two', () => {
    expect(findConflicts([tranche(1, '300'), tranche(2, '308')], PROGRAMMES)).toHaveLength(1)
    expect(findConflicts([tranche(1, '308'), tranche(2, '300')], PROGRAMMES)).toHaveLength(1)
  })

  it('ignores a tranche set to zero, which is funding nothing', () => {
    expect(findConflicts([tranche(1, '300'), tranche(2, '297', euros(0))], PROGRAMMES)).toEqual([])
  })

  it('reports a pair once however many tranches carry it', () => {
    const conflicts = findConflicts(
      [tranche(1, '300'), tranche(2, '297'), tranche(3, '297')],
      PROGRAMMES,
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.trancheIds).toHaveLength(3)
  })

  it('finds several distinct pairs at once', () => {
    const conflicts = findConflicts(
      [tranche(1, '300'), tranche(2, '297'), tranche(3, '261')],
      PROGRAMMES,
    )
    expect(conflicts.length).toBeGreaterThanOrEqual(2)
  })

  it('never reports a tranche as clashing with itself', () => {
    expect(findConflicts([tranche(1, '297'), tranche(2, '297')], PROGRAMMES)).toEqual([])
  })

  it('collects every affected tranche id for the interface to mark', () => {
    const conflicts = findConflicts(
      [tranche(1, '300'), tranche(2, '297'), tranche(3, 'bank')],
      PROGRAMMES,
    )
    const marked = trancheIdsInConflict(conflicts)
    expect(marked.has(1)).toBe(true)
    expect(marked.has(2)).toBe(true)
    expect(marked.has(3)).toBe(false)
  })
})
