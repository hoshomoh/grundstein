import { euros, type Money, toNumber } from '@/domain/money'

/* Money is formatted German-style in both languages, because the prices are German.
 * A buyer comparing this screen against a Sparkasse offer or a notary's invoice should
 * see the same shape of number: 600.000 €, 3,80 %. Switching to English grouping for
 * English copy would make the app read as though it were about a different country.
 *
 * These are the only Intl instances in the app (STANDARDS.md §5). Dates do not use
 * Intl at all — see lib/dates.ts for why. */
const MONEY_LOCALE = 'de-DE'

const wholeEuros = new Intl.NumberFormat(MONEY_LOCALE, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const centEuros = new Intl.NumberFormat(MONEY_LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plainNumber = new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 0 })

/** `600.000 €` — the default for prices, ceilings and totals. */
export function formatEuros(amount: Money): string {
  return wholeEuros.format(toNumber(amount))
}

/** `1.548,10 €` — for monthly payments, where the cents are the point. */
export function formatEurosWithCents(amount: Money): string {
  return centEuros.format(toNumber(amount))
}

/** `600.000` — grouped, no currency symbol. What a money input shows when idle. */
export function formatNumber(amount: Money): string {
  return plainNumber.format(toNumber(amount))
}

/* The space before the unit is a no-break space. With an ordinary one the browser is
 * free to wrap between the number and its unit, which at larger text sizes it does —
 * leaving a bare "%" stranded on the next line. */
const UNIT_SPACE = '\u00A0'

/** `3,80 %` — always two decimals, so a column of rates lines up. */
export function formatPercent(percent: number): string {
  const safe = Number.isFinite(percent) ? percent : 0
  return `${safe.toFixed(2).replace('.', ',')}${UNIT_SPACE}%`
}

/** `28 %` — no decimals, for a share where the fraction is noise and the space is tight. */
export function formatWholePercent(percent: number): string {
  const safe = Number.isFinite(percent) ? Math.round(percent) : 0
  return `${String(safe)}${UNIT_SPACE}%`
}

/** `6,5 %` — one decimal, for tax rates where the second is always zero. */
export function formatShortPercent(percent: number): string {
  const safe = Number.isFinite(percent) ? percent : 0
  return `${safe.toFixed(1).replace('.', ',')}${UNIT_SPACE}%`
}

/* German writes 1.250,50 where English writes 1,250.50 — the separators are swapped,
 * and a figure can arrive in either spelling. Reading 1,250.50 as 125,050 would be a
 * thousandfold error in a mortgage, so the shape is worked out rather than assumed. */
const NOISE = /[\s\u202F\u00A0\u2009'\u2019]/g

/** Whether every run of `separator` in `text` looks like thousands grouping. */
function looksLikeGrouping(text: string, separator: string): boolean {
  const parts = text.split(separator)
  const [first, ...rest] = parts
  if (first === undefined || rest.length === 0) return false

  // Grouping always leaves exactly three digits after each separator, and at most
  // three before the first one: 1.234.567, but never 1.23 or 1.2345.
  if (first.length > 3) return false
  return rest.every((part) => /^\d{3}$/.test(part))
}

/**
 * Which character is the decimal mark, or `null` when the number has no fraction.
 *
 * When both separators appear, the later one is the decimal mark — true in both
 * conventions. When only one appears it is grouping if it is positioned like grouping,
 * and a decimal mark otherwise.
 */
function decimalSeparatorOf(text: string): string | null {
  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')

  if (lastDot >= 0 && lastComma >= 0) return lastDot > lastComma ? '.' : ','
  if (lastComma >= 0) return looksLikeGrouping(text, ',') ? null : ','
  if (lastDot >= 0) return looksLikeGrouping(text, '.') ? null : '.'
  return null
}

/**
 * Read an amount a person typed.
 *
 * Returns `null` for anything that is not a number, so the caller can leave the figures
 * alone and keep showing what was typed (STANDARDS.md §4). It never guesses zero — a
 * half-typed "1." must not wipe the purchase price.
 */
export function parseMoney(text: string): Money | null {
  const trimmed = text.trim().replace(NOISE, '')
  if (trimmed === '') return null

  const decimalSeparator = decimalSeparatorOf(trimmed)
  const normalised =
    decimalSeparator === null
      ? trimmed.replace(/[.,]/g, '')
      : trimmed
          .split(decimalSeparator)
          .map((part) => part.replace(/[.,]/g, ''))
          .join('.')

  const cleaned = normalised.replace(/[^0-9.]/g, '')
  if (cleaned === '' || cleaned === '.') return null

  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null

  return euros(cleaned)
}

/**
 * Read a rate or a count of years.
 *
 * Unlike money these are small numbers that are never grouped, so a dot is always a
 * decimal point and a comma always means the same thing.
 */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const cleaned = trimmed.replace(',', '.').replace(/[^0-9.]/g, '')
  if (cleaned === '' || cleaned === '.') return null

  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null

  return value
}

/** A share of a whole as a percentage, guarding the zero denominator. */
export function shareOf(part: Money, whole: Money): number {
  if (whole.isZero()) return 0
  return part.dividedBy(whole).times(100).toNumber()
}

/** A CSS width like `42.35%`, clamped so a bar never overflows its track. */
export function percentWidth(part: Money, whole: Money): string {
  const share = Math.min(100, Math.max(0, shareOf(part, whole)))
  return `${share.toFixed(2)}%`
}
