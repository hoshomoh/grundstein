import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { startAppearanceSync } from './app/appearance-sync'
import { initialiseI18n } from './i18n'
import { createPrefersDarkStore } from './lib/appearance'
import { browserStorage } from './state/persistence'
import { SessionProvider } from './state/session-context'
import { createSessionStore } from './state/session-store'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  // Module augmentation works by declaration merging, which only an interface can do.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing its #root element')

const store = createSessionStore(browserStorage(window.localStorage))

initialiseI18n(store.getSnapshot().language)
startAppearanceSync(store, createPrefersDarkStore(window), document.documentElement, (title) => {
  document.title = title
})

/* A page being closed has no later, and the store's write is debounced by 300ms.
 * `pagehide` fires on close, navigation and the iOS back-forward cache alike, which
 * `beforeunload` does not. */
window.addEventListener('pagehide', () => {
  store.flush()
})

/* Temporary: `?debug=overflow` names whatever is widening the page, on screen, because
 * a phone has no console. Dynamically imported, so a normal load never fetches it.
 * Remove this and src/debug/ once the mobile overflow is traced. */
if (new URLSearchParams(window.location.search).get('debug') === 'overflow') {
  void import('./debug/report-overflow').then((module) => {
    module.reportOverflow()
  })
}

createRoot(rootElement).render(
  <StrictMode>
    <SessionProvider store={store}>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
)
