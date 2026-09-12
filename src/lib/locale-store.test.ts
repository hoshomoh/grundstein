import { describe, expect, it } from 'vitest'

import { preferredLanguage } from './locale-store'

describe('preferredLanguage', () => {
  it('picks German for a German browser', () => {
    expect(preferredLanguage(['de-DE', 'en-US'])).toBe('de')
    expect(preferredLanguage(['de'])).toBe('de')
  })

  it('picks English for an English browser', () => {
    expect(preferredLanguage(['en-GB'])).toBe('en')
  })

  it('reads the region off the tag rather than requiring an exact match', () => {
    expect(preferredLanguage(['de-AT'])).toBe('de')
    expect(preferredLanguage(['DE-ch'])).toBe('de')
  })

  it('walks down the list to the first language we have', () => {
    expect(preferredLanguage(['fr-FR', 'it', 'de-DE'])).toBe('de')
  })

  it('falls back to English when nothing matches', () => {
    expect(preferredLanguage(['fr-FR', 'ja'])).toBe('en')
    expect(preferredLanguage([])).toBe('en')
  })
})
