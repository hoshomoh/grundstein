import { describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'

import {
  formatEuros,
  formatEurosWithCents,
  formatNumber,
  formatPercent,
  formatShortPercent,
  parseDecimal,
  parseMoney,
  percentWidth,
  shareOf,
} from './format'

/* Intl inserts a narrow no-break space before the currency symbol and as the group
 * separator in some builds. Comparing on the digits alone keeps these tests from
 * failing on an ICU whitespace change rather than on a real regression. */
function digitsOf(text: string): string {
  return text.replace(/[\s\u202F\u00A0\u2009]/g, '')
}

describe('formatEuros', () => {
  it('groups German-style and drops the cents', () => {
    expect(digitsOf(formatEuros(euros(600_000)))).toBe('600.000€')
    expect(digitsOf(formatEuros(euros(1_234_567)))).toBe('1.234.567€')
  })

  it('rounds to the nearest euro', () => {
    expect(digitsOf(formatEuros(euros('1250.49')))).toBe('1.250€')
    expect(digitsOf(formatEuros(euros('1250.51')))).toBe('1.251€')
  })

  it('formats zero as zero, not as a blank', () => {
    expect(digitsOf(formatEuros(euros(0)))).toBe('0€')
  })
})

describe('formatEurosWithCents', () => {
  it('always shows two decimals, so a column lines up', () => {
    expect(digitsOf(formatEurosWithCents(euros('1548.1')))).toBe('1.548,10€')
    expect(digitsOf(formatEurosWithCents(euros(1500)))).toBe('1.500,00€')
  })
})

describe('formatNumber', () => {
  it('groups without a currency symbol, for input fields', () => {
    expect(digitsOf(formatNumber(euros(600_000)))).toBe('600.000')
    expect(formatNumber(euros(0))).toBe('0')
  })
})

describe('formatPercent', () => {
  it('uses a decimal comma and always two places', () => {
    expect(formatPercent(3.8)).toBe('3,80\u00A0%')
    expect(formatPercent(1.125)).toBe('1,13\u00A0%')
    expect(formatPercent(0)).toBe('0,00\u00A0%')
  })

  it('shows one place for tax rates', () => {
    expect(formatShortPercent(6.5)).toBe('6,5\u00A0%')
    expect(formatShortPercent(3.5)).toBe('3,5\u00A0%')
  })

  /* An ordinary space lets the browser wrap between the number and its unit, which it
   * does at larger text sizes — stranding a bare "%" on the next line. */
  it('binds the unit to its number with a no-break space', () => {
    expect(formatPercent(3.8)).not.toContain(' ')
    expect(formatShortPercent(6.5)).not.toContain(' ')
    expect(formatPercent(3.8)).toContain('\u00A0')
  })

  /* A NaN reaching the screen would read as a broken app; zero at least reads as a
   * number (STANDARDS.md §4). */
  it('never renders NaN or Infinity', () => {
    expect(formatPercent(Number.NaN)).toBe('0,00\u00A0%')
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('0,00\u00A0%')
    expect(formatShortPercent(Number.NaN)).toBe('0,0\u00A0%')
  })
})

describe('parseMoney', () => {
  it('reads a German figure with grouping and a decimal comma', () => {
    expect(parseMoney('1.250,50')?.equals(euros('1250.5'))).toBe(true)
    expect(parseMoney('600.000')?.equals(euros(600_000))).toBe(true)
  })

  /* Someone pasting out of an English spreadsheet should not have 1,250.50 read as
   * 125,050 — a thousandfold error in a mortgage is not a rounding problem. */
  it('reads an English figure without mangling it', () => {
    expect(parseMoney('1,250.50')?.equals(euros('1250.5'))).toBe(true)
  })

  /* The genuinely ambiguous shapes. The rule is that the last separator is the decimal
   * mark when both appear, and that a lone separator is grouping only when it sits
   * where grouping sits: exactly three digits after, at most three before. */
  it.each([
    { typed: '1.234.567,89', expected: '1234567.89', why: 'German, both separators' },
    { typed: '1,234,567.89', expected: '1234567.89', why: 'English, both separators' },
    { typed: '600.000', expected: '600000', why: 'lone dot in grouping position' },
    { typed: '600,000', expected: '600000', why: 'lone comma in grouping position' },
    { typed: '1.50', expected: '1.5', why: 'lone dot, two digits after, so decimal' },
    { typed: '1,50', expected: '1.5', why: 'lone comma, two digits after, so decimal' },
    { typed: '1234.5678', expected: '1234.5678', why: 'four digits after, so decimal' },
  ])('reads $typed as $expected — $why', ({ typed, expected }) => {
    expect(parseMoney(typed)?.equals(euros(expected))).toBe(true)
  })

  it('reads a bare number', () => {
    expect(parseMoney('600000')?.equals(euros(600_000))).toBe(true)
    expect(parseMoney('0')?.equals(euros(0))).toBe(true)
  })

  it('ignores spaces, apostrophes and stray currency symbols', () => {
    expect(parseMoney(' 600 000 € ')?.equals(euros(600_000))).toBe(true)
    expect(parseMoney("1'250")?.equals(euros(1250))).toBe(true)
  })

  /* The rule that keeps a half-typed field from wiping the purchase price: anything
   * unreadable returns null and the caller leaves the figures alone. */
  it('returns null rather than guessing zero', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('   ')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('.')).toBeNull()
    expect(parseMoney('€')).toBeNull()
  })

  /* The minus is stripped rather than honoured: no field in this app accepts a
   * negative amount, and reading "-5000" as 5000 is friendlier than rejecting it. */
  it('never yields a negative amount', () => {
    expect(parseMoney('-5000')?.isNegative()).toBe(false)
  })

  it('survives a round trip through formatting', () => {
    for (const amount of [euros(0), euros(1), euros(600_000), euros('123456.78')]) {
      const reparsed = parseMoney(formatNumber(amount))
      expect(reparsed?.equals(amount.toDecimalPlaces(0))).toBe(true)
    }
  })
})

describe('parseDecimal', () => {
  it('accepts either separator', () => {
    expect(parseDecimal('3,8')).toBe(3.8)
    expect(parseDecimal('3.8')).toBe(3.8)
  })

  it('accepts a whole number', () => {
    expect(parseDecimal('25')).toBe(25)
    expect(parseDecimal('0')).toBe(0)
  })

  it('returns null for anything unreadable', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('.')).toBeNull()
  })
})

describe('shareOf and percentWidth', () => {
  it('reports a share as a percentage', () => {
    expect(shareOf(euros(150_000), euros(600_000))).toBe(25)
  })

  it('is zero rather than NaN against a zero whole', () => {
    expect(shareOf(euros(100), euros(0))).toBe(0)
    expect(percentWidth(euros(100), euros(0))).toBe('0.00%')
  })

  it('renders a CSS width', () => {
    expect(percentWidth(euros(150_000), euros(600_000))).toBe('25.00%')
  })

  /* A bar wider than its track breaks the layout, and over-borrowing is a state the
   * user can reach on purpose. */
  it('clamps a share above 100 percent', () => {
    expect(percentWidth(euros(900_000), euros(600_000))).toBe('100.00%')
  })
})
