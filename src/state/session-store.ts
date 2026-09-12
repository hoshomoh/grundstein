import { deserialise, serialise, type SessionStorage, STORAGE_KEY } from './persistence'
import { defaultSessionState, type SessionState } from './session-state'

/** How long to wait before writing, so dragging a slider does not write 60 times. */
const WRITE_DELAY_MS = 300

export type SessionStore = {
  /** Register a listener; returns the unsubscribe. The shape useSyncExternalStore wants. */
  subscribe: (listener: () => void) => () => void
  /** The current state. Reference-stable until something actually changes. */
  getSnapshot: () => SessionState
  /** Replace the state by describing the change. */
  update: (change: (state: SessionState) => SessionState) => void
  /** Back to the worked example. */
  reset: () => void
  /** Write now rather than on the timer — for page-hide, where there is no later. */
  flush: () => void
}

/**
 * The app's state, held outside React and read through `useSyncExternalStore`.
 *
 * This is the shape STANDARDS.md §5 prescribes for anything synchronised with storage,
 * and it is what lets the app persist without a single `useEffect`: React subscribes,
 * the store writes, and neither has to know about the other's lifecycle.
 *
 * Storage is injected rather than reached for (§2), so the tests exercise the real
 * persistence path against a plain object instead of a mocked global.
 */
export function createSessionStore(storage: SessionStorage): SessionStore {
  let state = deserialise(storage.read(STORAGE_KEY))
  const listeners = new Set<() => void>()
  let writeTimer: ReturnType<typeof setTimeout> | undefined

  function scheduleWrite(): void {
    clearTimeout(writeTimer)
    writeTimer = setTimeout(() => {
      storage.write(STORAGE_KEY, serialise(state))
    }, WRITE_DELAY_MS)
  }

  function commit(next: SessionState): void {
    // Reference equality is the contract useSyncExternalStore relies on: returning a
    // fresh object every read would re-render on every tick, forever.
    if (next === state) return

    state = next
    scheduleWrite()
    for (const listener of listeners) listener()
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getSnapshot: () => state,

    update(change) {
      commit(change(state))
    },

    reset() {
      commit(defaultSessionState(state.language))
    },

    flush() {
      clearTimeout(writeTimer)
      storage.write(STORAGE_KEY, serialise(state))
    },
  }
}
