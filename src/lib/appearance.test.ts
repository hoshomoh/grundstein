import { describe, expect, it, vi } from 'vitest'

import { applyAppearance, createPrefersDarkStore, nextTheme, resolveDark } from './appearance'

describe('resolveDark', () => {
  it('obeys an explicit choice whatever the system says', () => {
    expect(resolveDark('dark', false)).toBe(true)
    expect(resolveDark('light', true)).toBe(false)
  })

  it('follows the system when set to auto', () => {
    expect(resolveDark('auto', true)).toBe(true)
    expect(resolveDark('auto', false)).toBe(false)
  })
})

describe('nextTheme', () => {
  /* The toggle flips what is on screen, not what is stored. Someone on `auto` in a
   * dark OS who presses it expects light, not "auto again". */
  it('flips away from whatever is currently showing', () => {
    expect(nextTheme('auto', true)).toBe('light')
    expect(nextTheme('auto', false)).toBe('dark')
    expect(nextTheme('dark', false)).toBe('light')
    expect(nextTheme('light', true)).toBe('dark')
  })
})

describe('applyAppearance', () => {
  /* The spies are held separately rather than read back off the element: reaching for
   * `root.classList.toggle` detaches a method from its object, which the lint rules
   * rightly refuse. */
  function element() {
    const toggle = vi.fn()
    const setProperty = vi.fn()
    const setAttribute = vi.fn()
    const root = {
      classList: { toggle },
      style: { setProperty },
      setAttribute,
    } as unknown as HTMLElement

    return { root, toggle, setProperty, setAttribute }
  }

  it('sets the dark class shadcn components read', () => {
    const { root, toggle } = element()
    applyAppearance(root, { theme: 'dark', fontScale: 1, language: 'en' }, false)
    expect(toggle).toHaveBeenCalledWith('dark', true)
  })

  it('leaves the dark class off in light mode', () => {
    const { root, toggle } = element()
    applyAppearance(root, { theme: 'light', fontScale: 1, language: 'en' }, true)
    expect(toggle).toHaveBeenCalledWith('dark', false)
  })

  it('sets the text-size multiplier and the language', () => {
    const { root, setProperty, setAttribute } = element()
    applyAppearance(root, { theme: 'light', fontScale: 1.32, language: 'de' }, false)
    expect(setProperty).toHaveBeenCalledWith('--gs-fs', '1.32')
    expect(setAttribute).toHaveBeenCalledWith('lang', 'de')
  })
})

describe('createPrefersDarkStore', () => {
  it('reports light where matchMedia is missing', () => {
    const store = createPrefersDarkStore(undefined)
    expect(store.getSnapshot()).toBe(false)
    expect(() => {
      store.subscribe(() => undefined)()
    }).not.toThrow()
  })

  it('reads and follows the media query', () => {
    const listeners = new Set<() => void>()
    const view = {
      matchMedia: () => ({
        matches: true,
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      }),
    } as unknown as Window

    const store = createPrefersDarkStore(view)
    expect(store.getSnapshot()).toBe(true)

    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    expect(listeners.size).toBe(1)

    unsubscribe()
    expect(listeners.size).toBe(0)
  })
})
