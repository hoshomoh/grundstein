import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import de from './locales/de.json'
import en from './locales/en.json'
import { DEFAULT_LANGUAGE, type Language } from './locales'

/* One namespace, because the app is one page and a back room. Splitting the copy into
 * namespaces would add a lookup prefix to every call and buy nothing. */
const resources = {
  en: { translation: en },
  de: { translation: de },
} as const

/**
 * Start i18next.
 *
 * The language is passed in rather than detected here: the session store owns it, so
 * that the reader's choice survives a reload and cannot drift from the date-fns locale
 * (STANDARDS.md §5).
 */
export function initialiseI18n(language: Language = DEFAULT_LANGUAGE): typeof i18next {
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      // React escapes everything it renders already.
      interpolation: { escapeValue: false },
      returnObjects: true,
    })
  }
  return i18next
}

export { i18next }
