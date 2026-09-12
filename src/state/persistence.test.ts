import { describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'

import { browserStorage, deserialise, SCHEMA_VERSION, serialise } from './persistence'
import { defaultSessionState, type SessionState } from './session-state'

function stored(overrides: Record<string, unknown>): string {
  return JSON.stringify({ version: SCHEMA_VERSION, ...overrides })
}

describe('round trip', () => {
  it('brings every field back unchanged', () => {
    const original: SessionState = {
      ...defaultSessionState(),
      price: euros(825_000),
      down: euros(140_000),
      stateCode: 'NW',
      notaryPercent: 1.2,
      agentInvolved: false,
      language: 'de',
      theme: 'dark',
      fontScale: 1.32,
    }

    const restored = deserialise(serialise(original))

    expect(restored.price.equals(original.price)).toBe(true)
    expect(restored.down.equals(original.down)).toBe(true)
    expect(restored.stateCode).toBe('NW')
    expect(restored.notaryPercent).toBe(1.2)
    expect(restored.agentInvolved).toBe(false)
    expect(restored.language).toBe('de')
    expect(restored.theme).toBe('dark')
    expect(restored.fontScale).toBe(1.32)
  })

  /* Money crosses JSON as a string precisely so it does not go back through binary
   * floating point on every reload. A cent lost per visit is a cent lost forever. */
  it('keeps an awkward amount exact to the cent', () => {
    const original = { ...defaultSessionState(), price: euros('123456.78') }
    expect(deserialise(serialise(original)).price.equals(euros('123456.78'))).toBe(true)
  })

  it('brings the tranches back with their follow-up periods', () => {
    const original: SessionState = {
      ...defaultSessionState(),
      tranches: [
        {
          id: 7,
          programmeKey: '261',
          name: 'My renovation loan',
          amount: euros('99999.99'),
          ratePercent: 2.6,
          years: 28,
          graceYears: 3,
          followupPeriods: [{ years: 12, ratePercent: 7.25 }],
        },
      ],
    }

    const [tranche] = deserialise(serialise(original)).tranches
    expect(tranche?.id).toBe(7)
    expect(tranche?.name).toBe('My renovation loan')
    expect(tranche?.amount.equals(euros('99999.99'))).toBe(true)
    expect(tranche?.graceYears).toBe(3)
    expect(tranche?.followupPeriods).toEqual([{ years: 12, ratePercent: 7.25 }])
  })

  it('survives a state with no tranches at all', () => {
    const original = { ...defaultSessionState(), tranches: [] }
    expect(deserialise(serialise(original)).tranches).toEqual([])
  })
})

describe('reading a payload that is not what we wrote', () => {
  const defaults = defaultSessionState()

  it('falls back when there is nothing stored', () => {
    expect(deserialise(null).price.equals(defaults.price)).toBe(true)
    expect(deserialise('').price.equals(defaults.price)).toBe(true)
  })

  /* The case that would otherwise be a blank page: a half-written payload, a browser
   * extension that mangled it, a value from a different app under the same key. */
  it('falls back on unparseable JSON', () => {
    expect(deserialise('{ not json').price.equals(defaults.price)).toBe(true)
    expect(deserialise('null').price.equals(defaults.price)).toBe(true)
    expect(deserialise('[]').price.equals(defaults.price)).toBe(true)
    expect(deserialise('"a string"').price.equals(defaults.price)).toBe(true)
  })

  it('falls back on a payload from a different schema version', () => {
    const old = JSON.stringify({ version: 0, price: '999999' })
    expect(deserialise(old).price.equals(defaults.price)).toBe(true)
  })

  it('falls back on a payload with no version at all', () => {
    expect(deserialise(JSON.stringify({ price: '999999' })).price.equals(defaults.price)).toBe(true)
  })

  /* Field-by-field rather than all-or-nothing: a reader whose price survived should
   * keep it even if their theme did not. */
  it('keeps the fields that read and defaults the ones that do not', () => {
    const restored = deserialise(
      stored({ price: '750000', stateCode: 'HH', theme: 'psychedelic', fontScale: 99 }),
    )

    expect(restored.price.equals(euros(750_000))).toBe(true)
    expect(restored.stateCode).toBe('HH')
    expect(restored.theme).toBe(defaults.theme)
    expect(restored.fontScale).toBe(defaults.fontScale)
  })

  it('refuses a negative or non-finite amount', () => {
    expect(deserialise(stored({ price: '-500' })).price.equals(defaults.price)).toBe(true)
    expect(deserialise(stored({ price: 'NaN' })).price.equals(defaults.price)).toBe(true)
    expect(deserialise(stored({ price: 'Infinity' })).price.equals(defaults.price)).toBe(true)
    expect(deserialise(stored({ price: { nested: true } })).price.equals(defaults.price)).toBe(true)
  })

  it('refuses an unknown language, project type or energy target', () => {
    const restored = deserialise(
      stored({ language: 'klingon', profile: { projectType: 'moonbase', energy: 'eh99' } }),
    )
    expect(restored.language).toBe(defaults.language)
    expect(restored.profile.projectType).toBe(defaults.profile.projectType)
    expect(restored.profile.energy).toBe(defaults.profile.energy)
  })

  it('drops a tranche with no id or programme rather than rendering a broken row', () => {
    const restored = deserialise(
      stored({
        tranches: [
          { id: 1, programmeKey: '124', amount: '50000' },
          { programmeKey: '124' },
          { id: 3 },
          'not an object',
        ],
      }),
    )
    expect(restored.tranches).toHaveLength(1)
    expect(restored.tranches[0]?.id).toBe(1)
  })

  it('falls back to the shipped tranches when the array is not an array', () => {
    expect(deserialise(stored({ tranches: 'nope' })).tranches).toHaveLength(
      defaults.tranches.length,
    )
  })
})

describe('browserStorage', () => {
  it('reads and writes through the storage it is given', () => {
    const map = new Map<string, string>()
    const storage = browserStorage({
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    } as unknown as Storage)

    storage.write('k', 'v')
    expect(storage.read('k')).toBe('v')
  })

  it('reports nothing stored when there is no storage at all', () => {
    expect(browserStorage(undefined).read('k')).toBeNull()
  })

  /* Safari in private mode throws on setItem rather than failing quietly, and a reader
   * who has blocked site data throws on both. Neither should break the page. */
  it('survives a storage that throws on every call', () => {
    const hostile = browserStorage({
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    } as unknown as Storage)

    expect(hostile.read('k')).toBeNull()
    expect(() => {
      hostile.write('k', 'v')
    }).not.toThrow()
  })
})

describe('state code validation', () => {
  /* A stored code that no longer names a Bundesland must not be taken at its word:
   * it would type-check as a StateCode and then silently fall back at render time,
   * so the stored value and the shown tax rate would disagree. */
  it('refuses a code that is not one of the sixteen', () => {
    const defaults = defaultSessionState()
    expect(deserialise(stored({ stateCode: 'XX' })).stateCode).toBe(defaults.stateCode)
    expect(deserialise(stored({ stateCode: 42 })).stateCode).toBe(defaults.stateCode)
  })

  it('accepts every code that is', () => {
    for (const code of ['BY', 'NW', 'TH', 'HB']) {
      expect(deserialise(stored({ stateCode: code })).stateCode).toBe(code)
    }
  })
})
