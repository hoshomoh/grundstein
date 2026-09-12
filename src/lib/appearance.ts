import type { Language } from '@/i18n/locales'
import type { FontScale, Theme } from '@/state/session-state'

export type Appearance = {
  theme: Theme
  fontScale: FontScale
  language: Language
}

/** Whether the dark palette should be showing, given the setting and the system. */
export function resolveDark(theme: Theme, systemPrefersDark: boolean): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return systemPrefersDark
}

/**
 * Write the appearance onto the document.
 *
 * This is the module that owns these attributes, and it writes them synchronously
 * (STANDARDS.md §5) rather than through an effect. `main.tsx` subscribes the store to
 * it once, outside React, so the class and the custom property are already correct
 * before the first paint.
 *
 * - `.dark` is shadcn's own dark-mode hook, so generated components follow it.
 * - `--gs-fs` scales the whole type ramp from one property.
 * - `lang` is what a screen reader uses to choose a voice.
 */
export function applyAppearance(
  documentElement: HTMLElement,
  appearance: Appearance,
  systemPrefersDark: boolean,
): void {
  documentElement.classList.toggle('dark', resolveDark(appearance.theme, systemPrefersDark))
  documentElement.style.setProperty('--gs-fs', String(appearance.fontScale))
  documentElement.setAttribute('lang', appearance.language)
}

export type MediaQueryStore = {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => boolean
}

/**
 * The system's colour-scheme preference, as something `useSyncExternalStore` can read.
 *
 * A media query is the textbook case for that hook rather than an effect (§5). Falls
 * back to "light" where `matchMedia` is missing, which is every server render and some
 * older embedded browsers.
 */
export function createPrefersDarkStore(view: Window | undefined): MediaQueryStore {
  const query = view?.matchMedia('(prefers-color-scheme: dark)')

  return {
    subscribe(listener) {
      if (!query) return () => undefined

      query.addEventListener('change', listener)
      return () => {
        query.removeEventListener('change', listener)
      }
    },
    getSnapshot: () => query?.matches ?? false,
  }
}

/** The next theme when the toggle is pressed, given what is on screen now. */
export function nextTheme(current: Theme, systemPrefersDark: boolean): Theme {
  return resolveDark(current, systemPrefersDark) ? 'light' : 'dark'
}
