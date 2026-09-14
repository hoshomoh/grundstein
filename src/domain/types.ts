import type { Money } from './money'

/* The vocabulary is CONTEXT.md's. A Tranche is one loan in the stack; a Programme is
 * the product it is an instance of. Rates are percentages written the way people write
 * them — 3.8 means 3.8% — and are ratios rather than money, so they stay `number`. */

export type ProgrammeKey = string

export type ProjectType = 'newbuild' | 'existing' | 'renovate'

export type EnergyTarget = 'qng' | 'eh40' | 'eh55' | 'eh85' | 'none'

export type StateCode =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH'

export type FederalState = {
  code: StateCode
  name: string
  /** Grunderwerbsteuer, as a percentage of the purchase price. */
  transferTaxPercent: number
  /** When this rate came into force, ISO date. */
  inForceSince: string
}

/**
 * Where a figure came from and when it was last checked.
 *
 * `source: null` marks a number as ours rather than the programme's — KfW 270's
 * ceiling, for instance, where the real limit is 150 million euros and we ship a
 * practical one. The interface must never present those as a KfW rule.
 */
export type Provenance = {
  source: string | null
  /** ISO date of the last check against `source`. */
  verifiedOn: string
  note?: string
}

/**
 * How much a programme will lend.
 *
 * KfW 300 and 308 do not have one ceiling — they have a grid that moves with the
 * number of children and, for 300, with QNG certification. Modelling that as a single
 * `cap` let a one-child household ask for a five-child amount.
 */
export type CeilingRule =
  { kind: 'flat'; amount: Money } | { kind: 'byChildren'; tiers: readonly ChildTier[] }

/**
 * One row of a ceiling grid. Tiers are ordered by `minChildren` ascending, and the
 * applicable tier is the last one whose `minChildren` the household meets.
 */
export type ChildTier = {
  minChildren: number
  standard: Money
  /** The ceiling with QNG certification, or `null` where QNG changes nothing. */
  withQng: Money | null
}

/**
 * A Tilgungszuschuss: a share of the loan the state repays on your behalf.
 *
 * It reduces the balance rather than the rate, so it moves both the monthly payment
 * and the lifetime interest. KfW 261 is the only programme here that pays one.
 */
export type RepaymentSubsidy = {
  /** Percentage of the loan, by the energy standard reached. */
  percentByEnergyTarget: Readonly<Record<EnergyTarget, number>>
  /** The subsidy is capped in absolute terms as well as proportionally. */
  maxAmount: Money
  /** Added when the building is among the worst-performing in its class. */
  worstPerformingBuildingBonusPercent: number
  serialRenovationBonusPercent: number
}

export type Programme = {
  key: ProgrammeKey
  name: string
  /** The short label used in chips, legends and the capital-structure bar. */
  short: string
  isKfw: boolean
  /** The official page, or `null` for the bank loan, which has none. */
  url: string | null

  ceiling: CeilingRule

  /* Starting points, not facts. KfW publishes no rates — every product page renders
   * its rate table as `-,-- %` — so `defaultRatePercent` is a plausible figure the
   * user is expected to replace with the one on their offer. */
  defaultAmount: Money
  defaultRatePercent: number
  defaultYears: number
  defaultGraceYears: number

  /** The longest term the programme allows: 30 years for 261 and 270, 35 elsewhere. */
  maxYears: number
  /** How long the rate is guaranteed. Ten years for every KfW product here. */
  zinsbindungYears: number

  projectTypes: readonly ProjectType[]
  /** `null` where the programme sets no energy condition. */
  energyTargets: readonly EnergyTarget[] | null
  requiresChild: boolean
  /** Household income ceiling for one child, or `null` where there is no test. */
  incomeCap: Money | null
  /** How far `incomeCap` rises for each child beyond the first. */
  incomeCapPerExtraChild: Money
  excludesExistingOwners: boolean
  /** KfW 270: a private applicant qualifies only by feeding the grid. */
  requiresGridFeed: boolean

  /** Programmes that may not fund the same home. The relation is symmetric. */
  excludes: readonly ProgrammeKey[]
  subsidy: RepaymentSubsidy | null

  provenance: Provenance
}

/** What the household tells us about itself. */
export type Profile = {
  projectType: ProjectType
  /** Children under 18. */
  children: number
  income: Money
  ownsHome: boolean
  energy: EnergyTarget
  /** Whether generated electricity or heat is fed into the grid. */
  feedsGrid: boolean
}

/** "After the fixed rate ends, assume N years at R%." */
export type FollowupPeriod = {
  years: number
  ratePercent: number
}

export type Tranche = {
  id: number
  programmeKey: ProgrammeKey
  name: string
  amount: Money
  ratePercent: number
  years: number
  /** Years paying interest only. Clamped to one month short of the term. */
  graceYears: number
  followupPeriods: readonly FollowupPeriod[]
}

/** Why a household does not qualify, or that it does. */
export type Eligibility = {
  ok: boolean
  /** Machine-readable so the copy can live in the locale files, not here. */
  reasons: readonly EligibilityReason[]
}

export type EligibilityReason =
  | { kind: 'projectType'; allowed: readonly ProjectType[] }
  | { kind: 'needsChild' }
  | { kind: 'incomeAboveLimit'; limit: Money }
  | { kind: 'alreadyOwns' }
  | { kind: 'energyTarget'; allowed: readonly EnergyTarget[] }
  | { kind: 'needsGridFeed' }
