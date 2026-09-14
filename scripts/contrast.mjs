#!/usr/bin/env node
/**
 * Every colour the app puts text in, checked against the ground it sits on — in both
 * themes, read from the same stylesheet the browser gets.
 *
 * A palette that passes in light and fails in dark is a palette that fails, and nobody
 * finds out until a reader says the text is hard to read. This runs in CI so the answer
 * arrives first.
 *
 * WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and for the meaningful parts of
 * a control. Hairlines and decorative fills are exempt, and are listed as exempt rather
 * than quietly left out.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CSS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.css')

const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const OFF = '\x1b[0m'

/** Text tokens, each at the threshold for the smallest size it is actually used at. */
const TEXT_TOKENS = [
  { token: '--ink', min: 4.5, use: 'body and headings' },
  { token: '--ink-2', min: 4.5, use: 'secondary prose' },
  { token: '--ink-3', min: 4.5, use: 'labels and eyebrows' },
  { token: '--shu', min: 4.5, use: 'the accent, used on small text' },
  { token: '--moku', min: 4.5, use: '"you probably qualify"' },
]

/** Not text: hairlines and bar fills. 3:1 where the fill itself carries meaning. */
const NON_TEXT_TOKENS = [
  { token: '--rule', min: 1, use: 'hairline, decorative' },
  { token: '--rule-2', min: 1, use: 'hairline, decorative' },
  ...Array.from({ length: 8 }, (_, index) => ({
    token: `--band-${index + 1}`,
    min: 3,
    use: 'capital-structure bar, always labelled in text too',
  })),
]

function channel(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The hex declarations inside one brace-delimited block, by token name. */
function block(css, selector) {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`${selector} not found in index.css`)
  const open = css.indexOf('{', start)
  const values = new Map()
  for (const line of css.slice(open + 1, css.indexOf('\n}', open)).split('\n')) {
    const match = /^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/.exec(line)
    if (match) values.set(match[1], match[2].toLowerCase())
  }
  return values
}

const css = readFileSync(CSS, 'utf8')
const light = block(css, '\n:root {')
const dark = block(css, '\n.dark {')

/* A parser that silently matched nothing would report a clean palette, which is the one
 * result this script must never invent. */
if (light.size < 15 || dark.size < 15) {
  console.error(`parsed ${light.size} light and ${dark.size} dark tokens — index.css changed shape`)
  process.exit(1)
}

let failed = 0
for (const [theme, palette] of [
  ['light', light],
  ['dark', dark],
]) {
  const ground = palette.get('--paper')
  console.log(`\n${BOLD}${theme} · on ${ground}${OFF}`)

  for (const { token, min, use } of [...TEXT_TOKENS, ...NON_TEXT_TOKENS]) {
    const colour = palette.get(token)
    if (!colour) {
      console.error(`  MISSING  ${token} is not defined in the ${theme} palette`)
      failed += 1
      continue
    }
    const ratio = contrast(colour, ground)
    const ok = ratio >= min
    if (!ok) failed += 1
    const mark = ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`
    console.log(
      `  ${mark} ${token.padEnd(10)} ${colour}  ${ratio.toFixed(2).padStart(5)}:1  (needs ${min}) — ${use}`,
    )
  }
}

console.log(
  failed === 0
    ? `\n${GREEN}✓ every colour clears its threshold in both themes${OFF}`
    : `\n${RED}✗ ${failed} below threshold${OFF}`,
)
process.exit(failed === 0 ? 0 : 1)
