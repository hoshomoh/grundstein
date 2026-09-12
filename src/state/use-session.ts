import { useSyncExternalStore } from 'react'

import type { SessionState } from './session-state'
import type { SessionStore } from './session-store'

/**
 * Read the session state.
 *
 * `getServerSnapshot` is the same function as `getSnapshot`: there is no server, and
 * the store is built before React renders, so the first read is already correct.
 */
export function useSession(store: SessionStore): SessionState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

/**
 * Read one derived value, re-rendering only when that value changes.
 *
 * The selector must return something reference-stable for an unchanged state —
 * a field, or a primitive computed from fields — or the comparison never settles.
 */
export function useSessionSelector<T>(store: SessionStore, select: (state: SessionState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getSnapshot()),
    () => select(store.getSnapshot()),
  )
}
