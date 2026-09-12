import { createContext, useContext, type ReactElement, type ReactNode } from 'react'

import type { SessionStore } from './session-store'

const SessionStoreContext = createContext<SessionStore | null>(null)

export type SessionProviderProps = {
  store: SessionStore
  children: ReactNode
}

/**
 * Hands the store to the tree.
 *
 * A context rather than a module singleton so a test can mount the app over a fake
 * storage (STANDARDS.md §2) instead of reaching into `localStorage`.
 */
export function SessionProvider({ store, children }: SessionProviderProps): ReactElement {
  return <SessionStoreContext value={store}>{children}</SessionStoreContext>
}

export function useSessionStore(): SessionStore {
  const store = useContext(SessionStoreContext)
  if (!store) throw new Error('useSessionStore was called outside a SessionProvider')
  return store
}
