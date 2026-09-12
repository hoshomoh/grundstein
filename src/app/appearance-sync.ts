import { i18next } from '@/i18n'
import { applyAppearance, type MediaQueryStore } from '@/lib/appearance'
import type { SessionStore } from '@/state/session-store'

/**
 * Keep the document's appearance and language matching the store.
 *
 * Deliberately outside React. These are writes to the document element, which this
 * module owns, so they happen synchronously the moment the store changes rather than
 * after a render (STANDARDS.md §5). Running it once before `createRoot` also means the
 * right palette and text size are in place before the first paint, so there is no
 * flash of the wrong theme.
 *
 * Returns the unsubscribe, which the caller keeps for the lifetime of the page.
 */
export function startAppearanceSync(
  store: SessionStore,
  prefersDark: MediaQueryStore,
  documentElement: HTMLElement,
): () => void {
  function sync(): void {
    const { theme, fontScale, language } = store.getSnapshot()
    applyAppearance(documentElement, { theme, fontScale, language }, prefersDark.getSnapshot())
    if (i18next.language !== language) void i18next.changeLanguage(language)
  }

  sync()

  const unsubscribeStore = store.subscribe(sync)
  const unsubscribeMedia = prefersDark.subscribe(sync)

  return () => {
    unsubscribeStore()
    unsubscribeMedia()
  }
}
