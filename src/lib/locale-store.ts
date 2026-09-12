import { i18next } from '@/i18n'
import { DEFAULT_LANGUAGE, isLanguage, type Language } from '@/i18n/locales'

/**
 * The one place the app's language is changed.
 *
 * i18next holds the copy and date-fns holds the month names, and the two must never
 * disagree — a German page with an English date reads as broken. Routing every change
 * through here is what makes that impossible: `lib/dates.ts` takes the language as an
 * argument rather than reaching for a global of its own.
 *
 * It also sets `<html lang>`, which is what a screen reader uses to pick a voice.
 */
export function applyLanguage(language: Language, documentElement: HTMLElement): void {
  void i18next.changeLanguage(language)
  documentElement.setAttribute('lang', language)
}

/** The language to open with, given what the browser says it prefers. */
export function preferredLanguage(navigatorLanguages: readonly string[]): Language {
  for (const tag of navigatorLanguages) {
    const base = tag.split('-')[0]?.toLowerCase()
    if (isLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}
