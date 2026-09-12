import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { euros } from '@/domain/money'

import { STORAGE_KEY, type SessionStorage } from './persistence'
import {
  addTranche,
  defaultSessionState,
  removeProgramme,
  removeTranche,
  restoreProgrammes,
  withDown,
  withPrice,
  withTranche,
} from './session-state'
import { createSessionStore } from './session-store'

function fakeStorage(initial?: string): SessionStorage & { contents: Map<string, string> } {
  const contents = new Map<string, string>()
  if (initial !== undefined) contents.set(STORAGE_KEY, initial)

  return {
    contents,
    read: (key) => contents.get(key) ?? null,
    write: (key, value) => void contents.set(key, value),
  }
}

describe('createSessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the worked example when nothing is stored', () => {
    const store = createSessionStore(fakeStorage())
    expect(store.getSnapshot().price.equals(euros(600_000))).toBe(true)
    expect(store.getSnapshot().tranches).toHaveLength(3)
  })

  /* useSyncExternalStore compares snapshots by reference. A getSnapshot that built a
   * fresh object each call would re-render forever, so this is a contract, not a
   * nicety. */
  it('returns the very same snapshot until something changes', () => {
    const store = createSessionStore(fakeStorage())
    expect(store.getSnapshot()).toBe(store.getSnapshot())

    const before = store.getSnapshot()
    store.update((state) => withPrice(state, euros(700_000)))
    expect(store.getSnapshot()).not.toBe(before)
  })

  it('does not notify when an update changes nothing', () => {
    const store = createSessionStore(fakeStorage())
    const listener = vi.fn()
    store.subscribe(listener)

    store.update((state) => state)
    expect(listener).not.toHaveBeenCalled()
  })

  it('tells every listener once per real change', () => {
    const store = createSessionStore(fakeStorage())
    const first = vi.fn()
    const second = vi.fn()
    store.subscribe(first)
    store.subscribe(second)

    store.update((state) => withPrice(state, euros(700_000)))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops telling a listener that has unsubscribed', () => {
    const store = createSessionStore(fakeStorage())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    unsubscribe()
    store.update((state) => withPrice(state, euros(700_000)))

    expect(listener).not.toHaveBeenCalled()
  })

  /* Dragging a slider fires dozens of updates a second. Writing on each one would
   * serialise the whole catalogue every frame. */
  it('writes once after a burst of updates, not once per update', () => {
    const storage = fakeStorage()
    const store = createSessionStore(storage)

    for (let i = 0; i < 20; i++) {
      store.update((state) => withPrice(state, euros(600_000 + i * 1000)))
    }
    expect(storage.contents.has(STORAGE_KEY)).toBe(false)

    vi.runAllTimers()
    expect(storage.contents.has(STORAGE_KEY)).toBe(true)
    expect(storage.contents.get(STORAGE_KEY)).toContain('619000')
  })

  it('writes immediately when flushed, for a page about to close', () => {
    const storage = fakeStorage()
    const store = createSessionStore(storage)

    store.update((state) => withPrice(state, euros(777_000)))
    store.flush()

    expect(storage.contents.get(STORAGE_KEY)).toContain('777000')
  })

  it('reads back what a previous session stored', () => {
    const storage = fakeStorage()
    const first = createSessionStore(storage)
    first.update((state) => withPrice(state, euros(950_000)))
    first.flush()

    const second = createSessionStore(storage)
    expect(second.getSnapshot().price.equals(euros(950_000))).toBe(true)
  })

  it('resets to the example but keeps the reader in their language', () => {
    const store = createSessionStore(fakeStorage())
    store.update((state) => ({ ...withPrice(state, euros(999_000)), language: 'de' }))

    store.reset()

    expect(store.getSnapshot().price.equals(euros(600_000))).toBe(true)
    expect(store.getSnapshot().language).toBe('de')
  })
})

describe('state changes', () => {
  const base = defaultSessionState()

  it('never lets the down payment exceed the price', () => {
    const large = withDown(base, euros(900_000))
    expect(large.down.equals(base.price)).toBe(true)
  })

  it('pulls the down payment down when the price drops below it', () => {
    const withBigDown = withDown(base, euros(300_000))
    const cheaper = withPrice(withBigDown, euros(200_000))
    expect(cheaper.down.equals(euros(200_000))).toBe(true)
  })

  it('leaves the down payment alone when the price rises', () => {
    const withSomeDown = withDown(base, euros(100_000))
    expect(withPrice(withSomeDown, euros(800_000)).down.equals(euros(100_000))).toBe(true)
  })

  it('patches one tranche and no other', () => {
    const patched = withTranche(base, 1, { ratePercent: 9.9 })
    expect(patched.tranches[0]?.ratePercent).toBe(9.9)
    expect(patched.tranches[1]?.ratePercent).toBe(base.tranches[1]?.ratePercent)
  })

  it('adds a tranche with a fresh id from the programme defaults', () => {
    const added = addTranche(base, '270')
    expect(added.tranches).toHaveLength(base.tranches.length + 1)
    expect(added.tranches.at(-1)?.id).toBe(base.nextTrancheId)
    expect(added.nextTrancheId).toBe(base.nextTrancheId + 1)
  })

  it('ignores a request to add a programme that does not exist', () => {
    expect(addTranche(base, 'nonsense').tranches).toHaveLength(base.tranches.length)
  })

  it('removes a tranche by id', () => {
    expect(removeTranche(base, 1).tranches.some((t) => t.id === 1)).toBe(false)
  })

  /* A tranche whose programme is gone has no ceiling, no rate rules and no exclusions.
   * It would render, and every number on it would be meaningless. */
  it('takes the tranches with a programme when that programme is deleted', () => {
    const without = removeProgramme(base, '300')
    expect(Object.keys(without.programmes)).not.toContain('300')
    expect(without.programmeOrder).not.toContain('300')
    expect(without.tranches.some((t) => t.programmeKey === '300')).toBe(false)
  })

  it('restores the originals without touching the readers own figures', () => {
    const edited = removeProgramme(withPrice(base, euros(850_000)), '300')
    const restored = restoreProgrammes(edited)

    expect(Object.keys(restored.programmes)).toContain('300')
    expect(restored.price.equals(euros(850_000))).toBe(true)
    expect(restored.profile).toEqual(base.profile)
  })

  it('drops only the tranches whose programme no longer exists after a restore', () => {
    const invented = {
      ...base,
      tranches: [...base.tranches, { ...base.tranches[0]!, id: 99, programmeKey: 'custom1' }],
    }
    const restored = restoreProgrammes(invented)

    expect(restored.tranches.some((t) => t.id === 99)).toBe(false)
    expect(restored.tranches).toHaveLength(base.tranches.length)
  })
})
