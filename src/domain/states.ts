import type { FederalState, StateCode } from './types'

/**
 * Grunderwerbsteuer by Bundesland.
 *
 * All sixteen verified 2026-09-11 against finanz-tools.de and rechenbar.de, which agree.
 * See docs/DATA-SOURCES.md. Two rates moved recently and both are reflected here:
 * Bremen rose to 5.5% on 2025-07-01, Thüringen fell to 5.0% on 2024-01-01.
 *
 * A warning for whoever checks these next: web search summaries currently claim
 * Thüringen is at 6.5%. That is stale pre-2024 data. Read a table, not a summary.
 */
export const FEDERAL_STATES: readonly FederalState[] = [
  { code: 'BW', name: 'Baden-Württemberg', transferTaxPercent: 5.0, inForceSince: '2011-11-05' },
  { code: 'BY', name: 'Bayern', transferTaxPercent: 3.5, inForceSince: '1997-01-01' },
  { code: 'BE', name: 'Berlin', transferTaxPercent: 6.0, inForceSince: '2014-01-01' },
  { code: 'BB', name: 'Brandenburg', transferTaxPercent: 6.5, inForceSince: '2015-07-01' },
  { code: 'HB', name: 'Bremen', transferTaxPercent: 5.5, inForceSince: '2025-07-01' },
  { code: 'HH', name: 'Hamburg', transferTaxPercent: 5.5, inForceSince: '2023-01-01' },
  { code: 'HE', name: 'Hessen', transferTaxPercent: 6.0, inForceSince: '2014-08-01' },
  {
    code: 'MV',
    name: 'Mecklenburg-Vorpommern',
    transferTaxPercent: 6.0,
    inForceSince: '2019-07-01',
  },
  { code: 'NI', name: 'Niedersachsen', transferTaxPercent: 5.0, inForceSince: '2014-01-01' },
  { code: 'NW', name: 'Nordrhein-Westfalen', transferTaxPercent: 6.5, inForceSince: '2015-01-01' },
  { code: 'RP', name: 'Rheinland-Pfalz', transferTaxPercent: 5.0, inForceSince: '2012-03-01' },
  { code: 'SL', name: 'Saarland', transferTaxPercent: 6.5, inForceSince: '2015-01-01' },
  { code: 'SN', name: 'Sachsen', transferTaxPercent: 5.5, inForceSince: '2023-01-01' },
  { code: 'ST', name: 'Sachsen-Anhalt', transferTaxPercent: 5.0, inForceSince: '2012-03-01' },
  { code: 'SH', name: 'Schleswig-Holstein', transferTaxPercent: 6.5, inForceSince: '2014-01-01' },
  { code: 'TH', name: 'Thüringen', transferTaxPercent: 5.0, inForceSince: '2024-01-01' },
]

/** The date FEDERAL_STATES was last checked against source, ISO. */
export const STATES_VERIFIED_ON = '2026-09-11'

const DEFAULT_STATE_CODE: StateCode = 'BY'

/** Whether a value names one of the sixteen states. */
export function isStateCode(value: unknown): value is StateCode {
  return typeof value === 'string' && FEDERAL_STATES.some((state) => state.code === value)
}

/**
 * The state for a code, falling back to Bayern rather than throwing.
 *
 * A persisted payload can name a state that no longer exists in the list; showing the
 * wrong state's tax is recoverable, a blank page is not.
 */
export function stateByCode(code: StateCode): FederalState {
  const found = FEDERAL_STATES.find((state) => state.code === code)
  if (found) return found

  const fallback = FEDERAL_STATES.find((state) => state.code === DEFAULT_STATE_CODE)
  if (!fallback) throw new Error('FEDERAL_STATES is missing its fallback state')
  return fallback
}
