import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('drops earlier Tailwind utilities that a later one overrides', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('ignores falsy entries so conditional classes read cleanly', () => {
    expect(cn('text-ink', false, undefined, null, 'font-mono')).toBe('text-ink font-mono')
  })
})
