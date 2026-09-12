// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { publishHeightTo } from './measure-height'

/** jsdom lays nothing out, so the one number this module reads is stated outright. */
function elementOfHeight(pixels: number): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'offsetHeight', { value: pixels, configurable: true })
  document.body.append(element)
  return element
}

describe('publishing a height to a custom property', () => {
  it('writes the measurement to the document root', () => {
    const attach = publishHeightTo('--test-h')
    attach(elementOfHeight(122))

    expect(document.documentElement.style.getPropertyValue('--test-h')).toBe('122px')
  })

  /* A stale measurement of an element that has left the page is worse than none: the
   * stylesheet's own fallback is at least a sane number. */
  it('clears it again when the element goes', () => {
    const attach = publishHeightTo('--test-gone')
    const detach = attach(elementOfHeight(64))

    expect(document.documentElement.style.getPropertyValue('--test-gone')).toBe('64px')
    detach?.()
    expect(document.documentElement.style.getPropertyValue('--test-gone')).toBe('')
  })

  it('does nothing when React detaches the ref', () => {
    const attach = publishHeightTo('--test-null')
    expect(attach(null)).toBeUndefined()
    expect(document.documentElement.style.getPropertyValue('--test-null')).toBe('')
  })
})
