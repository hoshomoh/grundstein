import { format, parseISO } from 'date-fns'
import { de, enGB } from 'date-fns/locale'

import type { Language } from '@/i18n/locales'

/* Every date in the app goes through this module (STANDARDS.md §5).
 *
 * Intl is deliberately not used for dates. Its output changes with the runtime's ICU
 * version, so the same build renders differently on different machines — under en-GB
 * it abbreviates September as "Sept" where the design says "Sep". date-fns carries its
 * own locale data, so a date looks the same everywhere.
 *
 * There is very little date work here: what the app shows is when a figure was last
 * checked against its source. */
const LOCALES = { en: enGB, de } as const

/** `11 September 2026` / `11. September 2026` — for "verified on" lines. */
export function formatVerifiedOn(isoDate: string, language: Language): string {
  return format(parseISO(isoDate), 'PPP', { locale: LOCALES[language] })
}

/** `11.09.2026` — the compact form, for tables. */
export function formatShortDate(isoDate: string, language: Language): string {
  return format(parseISO(isoDate), 'P', { locale: LOCALES[language] })
}

/** How many whole days ago a date was, for "checked N days ago" copy. */
export function daysSince(isoDate: string, now: Date): number {
  const then = parseISO(isoDate)
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((now.getTime() - then.getTime()) / millisecondsPerDay)
}
