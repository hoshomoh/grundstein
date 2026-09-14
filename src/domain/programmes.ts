import { euros, max, min, type Money } from './money'
import type { CeilingRule, Profile, Programme, ProgrammeKey } from './types'

/** The date every figure below was last checked against source. */
export const CATALOGUE_VERIFIED_ON = '2026-09-14'

const KFW = 'https://www.kfw.de/inlandsfoerderung/Privatpersonen'

/**
 * The eight loans the calculator knows, as verified on 2026-09-14.
 * The working record behind every figure is docs/DATA-SOURCES.md.
 *
 * Two kinds of number live here and they are not the same kind of thing:
 *
 *   - **Rules** — ceilings, income caps, project types, exclusions — are published by
 *     KfW and are verified facts, each carrying its `source` and `verifiedOn`.
 *   - **Rates and starting amounts** are not. KfW publishes no rates at all; every
 *     product page renders its rate table as `-,-- %` because rates are set
 *     individually at approval. Every `defaultRatePercent` here is a plausible opening
 *     figure the user is expected to replace, and the interface says so.
 */
export const PROGRAMMES: Readonly<Record<ProgrammeKey, Programme>> = {
  '297': {
    key: '297',
    name: 'KfW 297 – Klimafreundlicher Neubau',
    short: 'KfW 297',
    isKfw: true,
    url: `${KFW}/Neubau/Förderprodukte/Klimafreundlicher-Neubau-Wohngebäude-(297-298)/`,
    ceiling: { kind: 'flat', amount: euros(100_000) },
    defaultAmount: euros(100_000),
    defaultRatePercent: 2.1,
    defaultYears: 25,
    defaultGraceYears: 1,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['newbuild'],
    // EH55 without oil or gas heating now qualifies at the same ceiling. Modelling only
    // EH40 told EH55 households they did not qualify, which was wrong.
    energyTargets: ['eh55', 'eh40', 'qng'],
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    requiresGridFeed: false,
    excludes: ['298', '300', '261'],
    subsidy: null,
    provenance: {
      source: `${KFW}/Neubau/Förderprodukte/Klimafreundlicher-Neubau-Wohngebäude-(297-298)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
    },
  },

  '298': {
    key: '298',
    name: 'KfW 298 – Klimafreundl. Neubau + QNG',
    short: 'KfW 298',
    isKfw: true,
    url: `${KFW}/Neubau/Förderprodukte/Klimafreundlicher-Neubau-Wohngebäude-(297-298)/`,
    ceiling: { kind: 'flat', amount: euros(150_000) },
    defaultAmount: euros(150_000),
    defaultRatePercent: 2.1,
    defaultYears: 25,
    defaultGraceYears: 1,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['newbuild'],
    energyTargets: ['qng'],
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    requiresGridFeed: false,
    excludes: ['297', '300', '261'],
    subsidy: null,
    provenance: {
      source: `${KFW}/Neubau/Förderprodukte/Klimafreundlicher-Neubau-Wohngebäude-(297-298)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
    },
  },

  '300': {
    key: '300',
    name: 'KfW 300 – Wohneigentum für Familien',
    short: 'KfW 300',
    isKfw: true,
    url: `${KFW}/Neubau/Förderprodukte/Wohneigentum-für-Familien-(300)/`,
    // Not one ceiling but a grid of children × QNG. A one-child household without QNG
    // can borrow 170,000 €, not the 270,000 € a flat cap would have offered them.
    ceiling: {
      kind: 'byChildren',
      tiers: [
        { minChildren: 1, standard: euros(170_000), withQng: euros(220_000) },
        { minChildren: 3, standard: euros(200_000), withQng: euros(250_000) },
        { minChildren: 5, standard: euros(220_000), withQng: euros(270_000) },
      ],
    },
    defaultAmount: euros(170_000),
    defaultRatePercent: 1.12,
    defaultYears: 25,
    defaultGraceYears: 2,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['newbuild'],
    energyTargets: ['eh40', 'qng'],
    requiresChild: true,
    incomeCap: euros(90_000),
    incomeCapPerExtraChild: euros(10_000),
    excludesExistingOwners: true,
    requiresGridFeed: false,
    excludes: ['297', '298', '261'],
    subsidy: null,
    provenance: {
      source: `${KFW}/Neubau/Förderprodukte/Wohneigentum-für-Familien-(300)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
    },
  },

  '308': {
    key: '308',
    name: 'KfW 308 – Jung kauft Alt',
    short: 'KfW 308',
    isKfw: true,
    url: `${KFW}/Bestehende-Immobilie/Förderprodukte/Wohneigentum-für-Familien-Bestandserwerb-(308)/`,
    // Raised across the board since the prototype, which carried 100/125/150k — a
    // three-child household was being offered 30,000 € less than it can have.
    ceiling: {
      kind: 'byChildren',
      tiers: [
        { minChildren: 1, standard: euros(140_000), withQng: null },
        { minChildren: 2, standard: euros(160_000), withQng: null },
        { minChildren: 3, standard: euros(180_000), withQng: null },
      ],
    },
    defaultAmount: euros(140_000),
    defaultRatePercent: 1.51,
    defaultYears: 25,
    defaultGraceYears: 2,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['existing'],
    energyTargets: ['eh85'],
    requiresChild: true,
    incomeCap: euros(90_000),
    incomeCapPerExtraChild: euros(10_000),
    excludesExistingOwners: true,
    requiresGridFeed: false,
    excludes: ['300'],
    subsidy: null,
    provenance: {
      source: `${KFW}/Bestehende-Immobilie/Förderprodukte/Wohneigentum-für-Familien-Bestandserwerb-(308)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
      note: 'Requires buying a home in energy class F, G or H and renovating it to Effizienzhaus 85 EE within 54 months.',
    },
  },

  '124': {
    key: '124',
    name: 'KfW 124 – Wohneigentumsprogramm',
    short: 'KfW 124',
    isKfw: true,
    url: `${KFW}/Neubau/Förderprodukte/Wohneigentumsprogramm-(124)/`,
    ceiling: { kind: 'flat', amount: euros(100_000) },
    defaultAmount: euros(100_000),
    defaultRatePercent: 3.55,
    defaultYears: 25,
    defaultGraceYears: 1,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['newbuild', 'existing'],
    energyTargets: null,
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    requiresGridFeed: false,
    excludes: [],
    subsidy: null,
    provenance: {
      source: `${KFW}/Neubau/Förderprodukte/Wohneigentumsprogramm-(124)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
      note: 'Zinsbindung may also be 5 years; only the 10-year option is modelled.',
    },
  },

  '261': {
    key: '261',
    name: 'KfW 261 – BEG Wohngebäude',
    short: 'KfW 261',
    isKfw: true,
    url: `${KFW}/Bestehende-Immobilie/Förderprodukte/Bundesförderung-für-effiziente-Gebäude-Wohngebäude-Kredit-(261-262)/`,
    ceiling: { kind: 'flat', amount: euros(150_000) },
    defaultAmount: euros(120_000),
    defaultRatePercent: 2.6,
    defaultYears: 25,
    defaultGraceYears: 1,
    // 30, not 35 — this programme is shorter than the new-build ones.
    maxYears: 30,
    zinsbindungYears: 10,
    projectTypes: ['existing', 'renovate'],
    energyTargets: ['eh85', 'eh55', 'eh40', 'qng'],
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    requiresGridFeed: false,
    excludes: ['297', '298', '300'],
    // The one programme here that pays a Tilgungszuschuss. It reduces the balance, so
    // it moves both the monthly payment and the lifetime interest.
    subsidy: {
      /* Our `eh85` is the Erneuerbare-Energien variant — the option reads "EH70 to 85
       * EE". KfW pays a Tilgungszuschuss on EH70 and EH85 only in the
       * Nachhaltigkeits-Klasse, so the EE variant earns nothing. It was 5 here, which
       * promised a renovating household up to 7.500 € they would not receive. */
      percentByEnergyTarget: { qng: 15, eh40: 10, eh55: 5, eh85: 0, none: 0 },
      maxAmount: euros(22_500),
      worstPerformingBuildingBonusPercent: 10,
      serialRenovationBonusPercent: 15,
    },
    provenance: {
      source: `${KFW}/Bestehende-Immobilie/Förderprodukte/Bundesförderung-für-effiziente-Gebäude-Wohngebäude-Kredit-(261-262)/`,
      verifiedOn: CATALOGUE_VERIFIED_ON,
      note: 'The building permit must be at least 5 years old. Renovation only, not new build.',
    },
  },

  '270': {
    key: '270',
    name: 'KfW 270 – Erneuerbare Energien',
    short: 'KfW 270',
    isKfw: true,
    url: 'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/Förderprodukte/Erneuerbare-Energien-Standard-(270)/',
    // Ours, not KfW's. The programme lends up to 150 million euros per project, which
    // would make the amount slider meaningless; 150,000 € is a sane domestic solar
    // ceiling. Flagged in `provenance.note` so it is never shown as a KfW rule.
    ceiling: { kind: 'flat', amount: euros(150_000) },
    defaultAmount: euros(15_000),
    defaultRatePercent: 4.3,
    defaultYears: 10,
    defaultGraceYears: 0,
    maxYears: 30,
    zinsbindungYears: 10,
    projectTypes: ['newbuild', 'existing', 'renovate'],
    energyTargets: null,
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    // A private applicant qualifies only by feeding the electricity or heat into the grid.
    requiresGridFeed: true,
    excludes: [],
    subsidy: null,
    provenance: {
      source:
        'https://www.kfw.de/inlandsfoerderung/Unternehmen/Energie-Umwelt/Förderprodukte/Erneuerbare-Energien-Standard-(270)/',
      verifiedOn: CATALOGUE_VERIFIED_ON,
      note: "The 150,000 € ceiling is ours, not the programme's: KfW lends up to 150 million euros per project. A market rate, not a subsidised one.",
    },
  },

  bank: {
    key: 'bank',
    name: 'Bank mortgage',
    short: 'Hausbank',
    isKfw: false,
    url: null,
    ceiling: { kind: 'flat', amount: euros(2_000_000) },
    defaultAmount: euros(330_000),
    defaultRatePercent: 3.8,
    defaultYears: 25,
    defaultGraceYears: 0,
    maxYears: 35,
    zinsbindungYears: 10,
    projectTypes: ['newbuild', 'existing', 'renovate'],
    energyTargets: null,
    requiresChild: false,
    incomeCap: null,
    incomeCapPerExtraChild: euros(0),
    excludesExistingOwners: false,
    requiresGridFeed: false,
    excludes: [],
    subsidy: null,
    // Not a KfW product, so there is no page to verify against. Every figure is ours.
    provenance: { source: null, verifiedOn: CATALOGUE_VERIFIED_ON },
  },
}

/** The order programmes appear in, in the add-loan strip and the Library. */
export const PROGRAMME_ORDER: readonly ProgrammeKey[] = [
  '297',
  '298',
  '300',
  '308',
  '124',
  '261',
  '270',
  'bank',
]

/**
 * The most this household can borrow under this programme.
 *
 * A flat ceiling ignores the profile. A tiered one reads the number of children and,
 * where the programme offers it, whether the household is targeting QNG — so the
 * amount slider's bound moves as those answers change, and nobody is quoted a monthly
 * payment on money they would be refused.
 */
export function maxLoanFor(ceiling: CeilingRule, profile: Profile): Money {
  if (ceiling.kind === 'flat') return ceiling.amount

  const applicable = ceiling.tiers.filter((tier) => profile.children >= tier.minChildren)
  const tier = applicable.at(-1)
  // Below the lowest tier — a household with no children — nothing is on offer. The
  // eligibility check reports why; this just refuses to invent a ceiling.
  if (!tier) return euros(0)

  if (profile.energy === 'qng' && tier.withQng) return tier.withQng
  return tier.standard
}

/** The largest ceiling a programme offers to anyone, for slider bounds and copy. */
export function highestCeiling(ceiling: CeilingRule): Money {
  if (ceiling.kind === 'flat') return ceiling.amount

  return ceiling.tiers.reduce<Money>(
    (highest, tier) => max(highest, tier.withQng ?? tier.standard),
    euros(0),
  )
}

/**
 * What a tranche can actually draw: what the reader asked for, capped by what this
 * household may borrow under this programme.
 *
 * The cap is not fixed. KfW 300's ceiling is a grid of children × QNG, so answering
 * "one child" after sliding a five-child household's loan to 270,000 € drops the
 * ceiling to 170,000 €. Without this the page went on quoting a monthly payment on
 * 100,000 € the household would be refused — which is the one thing this app must
 * never do.
 *
 * The reader's own figure is left in the state rather than overwritten: put the
 * children back and their number comes back with them. The interface shows the drawable
 * figure and says what it did.
 */
export function drawableAmount(
  amount: Money,
  programme: Programme | undefined,
  profile: Profile,
): Money {
  if (!programme) return amount
  return min(amount, maxLoanFor(programme.ceiling, profile))
}
