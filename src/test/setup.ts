import '@testing-library/jest-dom/vitest'

/* jsdom implements neither ResizeObserver nor matchMedia, and Radix's slider, select
 * and checkbox all measure themselves on mount. Without these a component test fails
 * with a ReferenceError from inside a dependency, which says nothing about the code
 * under test. These are the narrowest stubs that let the real components mount —
 * anything that depends on an actual measurement is asserted in the browser, not here. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {
      // Nothing to observe: jsdom lays nothing out.
    }
    unobserve(): void {}
    disconnect(): void {}
  }
}

if (typeof globalThis.matchMedia === 'undefined' && typeof globalThis.window !== 'undefined') {
  globalThis.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

/* Radix uses pointer-capture APIs jsdom does not provide. */
if (typeof globalThis.Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
}
