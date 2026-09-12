import type { Money } from './money'
import type {
  Eligibility,
  EligibilityReason,
  Profile,
  Programme,
  ProgrammeKey,
  Tranche,
} from './types'

/**
 * The income ceiling for this household.
 *
 * KfW 300 and 308 allow 90,000 € for one child and 10,000 € more for each child
 * beyond the first, so the limit moves with the family rather than being a single
 * number.
 */
export function incomeLimitFor(programme: Programme, profile: Profile): Money | null {
  if (!programme.incomeCap) return null

  const extraChildren = Math.max(0, profile.children - 1)
  return programme.incomeCap.plus(programme.incomeCapPerExtraChild.times(extraChildren))
}

/**
 * Whether this household qualifies, and if not, every reason why.
 *
 * Reasons are returned as data rather than sentences: the copy lives in the locale
 * files (STANDARDS.md §5), and a caller that only wants a yes/no can ignore them.
 * Every failing condition is reported, not just the first — a household told to fix
 * one thing only to hit the next is being led in circles.
 */
export function checkEligibility(programme: Programme, profile: Profile): Eligibility {
  const reasons: EligibilityReason[] = []

  if (!programme.projectTypes.includes(profile.projectType)) {
    reasons.push({ kind: 'projectType', allowed: programme.projectTypes })
  }

  if (programme.requiresChild && profile.children < 1) {
    reasons.push({ kind: 'needsChild' })
  }

  const limit = incomeLimitFor(programme, profile)
  if (limit && profile.income.greaterThan(limit)) {
    reasons.push({ kind: 'incomeAboveLimit', limit })
  }

  if (programme.excludesExistingOwners && profile.ownsHome) {
    reasons.push({ kind: 'alreadyOwns' })
  }

  /* "Not sure yet" is not a failure. Someone who has not chosen an energy target is
   * still shopping, and refusing them every KfW loan would be worse than useless. */
  if (
    programme.energyTargets &&
    profile.energy !== 'none' &&
    !programme.energyTargets.includes(profile.energy)
  ) {
    reasons.push({ kind: 'energyTarget', allowed: programme.energyTargets })
  }

  // KfW 270: a private applicant qualifies only by feeding the grid.
  if (programme.requiresGridFeed && !profile.feedsGrid) {
    reasons.push({ kind: 'needsGridFeed' })
  }

  return { ok: reasons.length === 0, reasons }
}

/**
 * Every programme that cannot fund the same home as this one.
 *
 * The relation is symmetric, but the catalogue only has to declare it from one side —
 * so this reads both directions rather than trusting either entry alone.
 */
export function excludedProgrammes(
  key: ProgrammeKey,
  programmes: Readonly<Record<ProgrammeKey, Programme>>,
): ProgrammeKey[] {
  const self = programmes[key]
  if (!self) return []

  const excluded = new Set<ProgrammeKey>(self.excludes)
  for (const other of Object.values(programmes)) {
    if (other.key !== key && other.excludes.includes(key)) excluded.add(other.key)
  }

  return [...excluded]
}

/** A pair of tranches that may not both fund the same home. */
export type Conflict = {
  a: ProgrammeKey
  b: ProgrammeKey
  /** The tranches involved, so the interface can mark them. */
  trancheIds: readonly number[]
}

/**
 * Clashes among the tranches that are actually being used.
 *
 * A tranche set to zero is not funding anything, so it cannot clash with anything.
 * Each pair of programmes is reported once however many tranches carry them.
 */
export function findConflicts(
  tranches: readonly Tranche[],
  programmes: Readonly<Record<ProgrammeKey, Programme>>,
): Conflict[] {
  const active = tranches.filter((tranche) => tranche.amount.greaterThan(0))
  const byPair = new Map<string, Conflict>()

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const first = active[i]
      const second = active[j]
      if (!first || !second) continue

      const a = programmes[first.programmeKey]
      const b = programmes[second.programmeKey]
      if (!a || !b || a.key === b.key) continue

      if (!a.excludes.includes(b.key) && !b.excludes.includes(a.key)) continue

      const pairKey = [a.key, b.key].sort().join('|')
      const existing = byPair.get(pairKey)
      const ids = new Set(existing?.trancheIds ?? [])
      ids.add(first.id)
      ids.add(second.id)
      byPair.set(pairKey, { a: a.key, b: b.key, trancheIds: [...ids] })
    }
  }

  return [...byPair.values()]
}

/** Whether a given tranche is caught up in any conflict. */
export function trancheIdsInConflict(conflicts: readonly Conflict[]): Set<number> {
  const ids = new Set<number>()
  for (const conflict of conflicts) for (const id of conflict.trancheIds) ids.add(id)
  return ids
}
