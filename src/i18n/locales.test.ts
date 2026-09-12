import { describe, expect, it } from 'vitest'

import de from './locales/de.json'
import en from './locales/en.json'
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGE_LABELS, LANGUAGES } from './locales'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** Every leaf path in a locale file, as dotted keys with array indices. */
function paths(value: Json, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => paths(item, `${prefix}[${String(index)}]`))
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      paths(child, prefix === '' ? key : `${prefix}.${key}`),
    )
  }
  return [prefix]
}

/** Every `{{placeholder}}` in a string. */
function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? '').sort()
}

function stringAt(source: Json, path: string): string | undefined {
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let cursor: Json | undefined = source
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, Json>)[segment]
  }
  return typeof cursor === 'string' ? cursor : undefined
}

const enPaths = paths(en)
const dePaths = paths(de)

describe('the locale registry', () => {
  it('lists a label for every language', () => {
    for (const language of LANGUAGES) expect(LANGUAGE_LABELS[language]).toBeTruthy()
  })

  it('has a default that is one of the languages', () => {
    expect(LANGUAGES).toContain(DEFAULT_LANGUAGE)
  })

  it('recognises its own languages and nothing else', () => {
    expect(isLanguage('en')).toBe(true)
    expect(isLanguage('de')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(null)).toBe(false)
    expect(isLanguage(42)).toBe(false)
  })
})

describe('en and de', () => {
  /* The test that stops a half-translated release. A key present in English and
   * missing in German shows an English sentence inside German copy, which reads as a
   * bug to the one audience most likely to be using the app. */
  it('describe exactly the same keys', () => {
    const missingFromDe = enPaths.filter((path) => !dePaths.includes(path))
    const missingFromEn = dePaths.filter((path) => !enPaths.includes(path))

    expect(missingFromDe, 'keys in en.json but not de.json').toEqual([])
    expect(missingFromEn, 'keys in de.json but not en.json').toEqual([])
  })

  it('have the same number of FAQ entries and principles', () => {
    expect(de.faq).toHaveLength(en.faq.length)
    expect(de.principles).toHaveLength(en.principles.length)
  })

  /* A placeholder that exists in one language and not the other renders a literal
   * "{{limit}}" on screen, or silently drops the number the sentence is about. */
  it('use the same placeholders in every shared string', () => {
    const mismatched: string[] = []

    for (const path of enPaths) {
      const source = stringAt(en, path)
      const target = stringAt(de, path)
      if (source === undefined || target === undefined) continue

      const a = placeholdersIn(source)
      const b = placeholdersIn(target)
      if (a.join(',') !== b.join(','))
        mismatched.push(`${path}: en[${a.join(',')}] de[${b.join(',')}]`)
    }

    expect(mismatched).toEqual([])
  })

  it('leave no string empty', () => {
    for (const [name, file] of [
      ['en', en],
      ['de', de],
    ] as const) {
      for (const path of paths(file)) {
        const text = stringAt(file, path)
        expect(text?.trim(), `${name}.${path}`).not.toBe('')
      }
    }
  })

  it('keeps the numerals identical, since they are not words', () => {
    expect(de.principles.map((p) => p.numeral)).toEqual(en.principles.map((p) => p.numeral))
  })

  it('covers every value of the enums the interface renders', () => {
    for (const file of [en, de]) {
      expect(Object.keys(file.profile.projectOptions).sort()).toEqual([
        'existing',
        'newbuild',
        'renovate',
      ])
      expect(Object.keys(file.profile.energyOptions).sort()).toEqual([
        'eh40',
        'eh55',
        'eh85',
        'none',
        'qng',
      ])
      expect(Object.keys(file.eligibility.reasons).sort()).toEqual([
        'alreadyOwns',
        'energyTarget',
        'incomeAboveLimit',
        'needsChild',
        'needsGridFeed',
        'projectType',
      ])
    }
  })
})
