#!/usr/bin/env node
/**
 * Every text colour the app uses, against the ground it actually sits on, at the size
 * it is actually set in, in both themes.
 *
 * Checking a palette against one background is not enough. `--ink-2` on paper and
 * `--ink-2` on a dialog's card are different numbers; paper reversed out of vermilion
 * is a third; and the threshold itself moves with the size — WCAG 2.2 AA wants 4.5:1
 * for body text but only 3:1 once the type reaches 24px. So the unit checked here is a
 * *usage*: a colour, a ground, and a size.
 *
 * The table below is the list of those usages. It is not decoration: the script fails
 * if a `text-*` colour appears anywhere in `src/` that the table does not cover, so a
 * new colour cannot be introduced without someone saying where it sits and how big it
 * is. That is what makes "always readable wherever it is used" checkable rather than
 * hopeful.
 *
 * Sizes are given at --gs-fs: 1, the smallest the reader can set. Where a size is a
 * clamp(), the minimum is used: the narrowest screen is the worst case.
 */
import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = join(ROOT, 'src', 'index.css')
const SRC = join(ROOT, 'src')

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const OFF = '\x1b[0m'

/** The type scale, at --gs-fs: 1 and at the small end of every clamp(). */
const SIZES = {
  label: 12,
  xs: 13,
  sm: 14,
  base: 15,
  md: 16,
  lg: 18,
  xl: 21,
  'bar-figure': 16,
  h2: 22,
  'hero-figure': 34,
  h1: 38,
}

/** WCAG 2.2: large text is 24px and up (or 18.66px bold, which this app does not use). */
function thresholdFor(px) {
  return px >= 24 ? 3 : 4.5
}

/**
 * Every place the app puts text on a ground, as `[colour, ground, size, where]`.
 * Grounds are token names; `paper` is the page, `card` the raised surfaces.
 */
const USAGES = [
  ['--ink', '--paper', 'base', 'body copy, headings, figures'],
  ['--ink', '--card', 'sm', 'dialog titles and popover items'],
  ['--ink-2', '--paper', 'xs', 'secondary prose, loan notes, callout bodies'],
  ['--ink-2', '--card', 'sm', 'dialog descriptions'],
  ['--ink-3', '--paper', 'label', 'eyebrows, field labels, chart axis'],
  ['--ink-3', '--card', 'label', 'muted text on raised surfaces'],
  ['--shu', '--paper', 'label', 'accent labels, readings, section numerals'],
  ['--shu', '--card', 'label', 'accent on raised surfaces'],
  ['--moku', '--paper', 'label', '"you probably qualify"'],
  ['--paper', '--shu', 'label', 'the active text-size button, the confirm action'],
  ['--paper', '--ink', 'xs', 'the tooltip, which reverses the page out'],
]

/** Not text. Listed so the exemption is a decision on the page, not an omission. */
const NON_TEXT = [
  ['--rule', '--paper', 1, 'hairline rules and field underlines'],
  ['--rule-2', '--paper', 1, 'the fainter hairline'],
  ...Array.from({ length: 8 }, (_, index) => [
    `--band-${index + 1}`,
    '--paper',
    3,
    'capital-structure bar, every segment also labelled in text',
  ]),
]

function channel(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** `#rrggbb` or `rgb(r g b / a)` into [r, g, b, a]. */
function parseColour(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (hex) {
    const n = Number.parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/i.exec(value.trim())
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], +rgb[4]]
  return null
}

/** Lay a possibly-translucent colour over an opaque one. */
function over([r, g, b, a], [br, bg, bb]) {
  return [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a), 1]
}

/** Declarations in one brace-delimited block, values left as written. */
function block(css, selector) {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`${selector} not found in index.css`)
  const open = css.indexOf('{', start)
  const values = new Map()
  for (const line of css.slice(open + 1, css.indexOf('\n}', open)).split('\n')) {
    const match = /^\s*(--[\w-]+)\s*:\s*([^;]+);/.exec(line)
    if (match) values.set(match[1], match[2].trim())
  }
  return values
}

/** Follow `var(--x)` chains until a literal colour falls out. */
function resolve(palette, token, seen = new Set()) {
  if (seen.has(token)) throw new Error(`${token} refers to itself`)
  seen.add(token)

  const raw = palette.get(token)
  if (raw === undefined) return null

  const direct = parseColour(raw)
  if (direct) return direct

  const reference = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw)
  return reference ? resolve(palette, reference[1], seen) : null
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry) ? [full] : []
  })
}

const css = readFileSync(CSS, 'utf8')
const light = block(css, '\n:root {')
const dark = block(css, '\n.dark {')

if (light.size < 20 || dark.size < 10) {
  console.error(
    `parsed ${light.size} light and ${dark.size} dark declarations — index.css changed shape`,
  )
  process.exit(1)
}

let failed = 0

for (const [theme, overrides] of [
  ['light', new Map()],
  ['dark', dark],
]) {
  const palette = new Map([...light, ...overrides])
  console.log(`\n${BOLD}${theme}${OFF}`)

  const rows = [
    ...USAGES.map(([fg, bg, size, where]) => [
      fg,
      bg,
      thresholdFor(SIZES[size]),
      `${SIZES[size]}px`,
      where,
    ]),
    ...NON_TEXT.map(([fg, bg, min, where]) => [fg, bg, min, '—', where]),
  ]

  for (const [fg, bg, min, size, where] of rows) {
    const ground = resolve(palette, bg)
    const colour = resolve(palette, fg)
    if (!ground || !colour) {
      console.error(`  MISSING  ${fg} on ${bg} does not resolve in the ${theme} palette`)
      failed += 1
      continue
    }

    const ratio = contrast(over(colour, ground), ground)
    const ok = ratio >= min
    if (!ok) failed += 1
    console.log(
      `  ${ok ? `${GREEN}ok  ${OFF}` : `${RED}FAIL${OFF}`} ${fg.padEnd(9)} on ${bg.padEnd(8)} ${size.padStart(5)} ${ratio.toFixed(2).padStart(6)}:1 (needs ${min}) ${DIM}${where}${OFF}`,
    )
  }
}

/* Completeness. A colour nobody wrote a usage for is a colour nobody checked. */
const declared = new Set(USAGES.map(([fg]) => fg))
const ALIASES = {
  foreground: '--ink',
  'card-foreground': '--ink',
  'popover-foreground': '--ink',
  'secondary-foreground': '--ink',
  'muted-foreground': '--ink-3',
  'accent-foreground': '--shu',
  'primary-foreground': '--paper',
  'sidebar-foreground': '--ink',
  'sidebar-primary-foreground': '--paper',
  'sidebar-accent-foreground': '--shu',
  background: '--paper',
  primary: '--shu',
  destructive: '--shu',
  ink: '--ink',
  'ink-2': '--ink-2',
  'ink-3': '--ink-3',
  shu: '--shu',
  moku: '--moku',
  paper: '--paper',
  card: '--card',
}

/* `text-*` also spells sizes and alignment. Listing those explicitly means anything
 * left over is a colour — including one from outside the palette, which is the case
 * this guard exists to catch. */
const NOT_A_COLOUR = new Set([
  ...Object.keys(SIZES),
  'left',
  'right',
  'center',
  'start',
  'end',
  'justify',
  'ellipsis',
  'clip',
  'wrap',
  'nowrap',
  'balance',
  'pretty',
  'inherit',
  'current',
  'transparent',
  'size',
])

const used = new Set()
const unknown = new Set()
for (const file of sourceFiles(SRC)) {
  // Module specifiers are not class names: `from './text-input'` is not a colour.
  const code = readFileSync(file, 'utf8').replaceAll(/from\s+'[^']*'|import\('[^']*'\)/g, '')

  for (const [, name] of code.matchAll(/\btext-([a-z][a-z0-9-]*)\b/g)) {
    if (NOT_A_COLOUR.has(name)) continue
    if (name in ALIASES) used.add(ALIASES[name])
    else unknown.add(name)
  }
}

const unchecked = [...used].filter((token) => !declared.has(token))
if (unchecked.length > 0) {
  failed += unchecked.length
  console.error(
    `\n${RED}${unchecked.length} palette colour(s) used in src/ with no usage in the table: ${unchecked.join(', ')}${OFF}`,
  )
  console.error('Add a row to USAGES saying where it sits and how big it is.')
}

if (unknown.size > 0) {
  failed += unknown.size
  console.error(
    `\n${RED}${unknown.size} text colour(s) from outside the palette: ${[...unknown].map((name) => `text-${name}`).join(', ')}${OFF}`,
  )
  console.error(
    'Every colour comes from a token (STANDARDS.md §5). Use one, or add it to the palette and the table.',
  )
}

console.log(
  failed === 0
    ? `\n${GREEN}✓ ${USAGES.length} text usages and ${NON_TEXT.length} fills clear their thresholds in both themes${OFF}`
    : `\n${RED}✗ ${failed} problem(s)${OFF}`,
)
process.exit(failed === 0 ? 0 : 1)
