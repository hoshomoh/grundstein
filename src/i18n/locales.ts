/* Adding a language is adding a JSON file and one entry here — never a code change
 * anywhere else (STANDARDS.md §5). */
export const LANGUAGES = ['en', 'de'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'

/** What each language calls itself, for the language switch. */
export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  en: 'EN',
  de: 'DE',
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.includes(value as Language)
}
