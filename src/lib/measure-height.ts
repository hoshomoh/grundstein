import type { RefCallback } from 'react'

/**
 * A ref callback that publishes an element's height to a CSS custom property on the
 * document root, and keeps it current while the element is on screen.
 *
 * This exists for one thing: the loans strip pins directly beneath the sticky summary
 * bar, so it needs that bar's height as its `top` offset. The height is not a constant.
 * The bar's three figures sit on one row on a desktop and wrap to two on a phone, and
 * every text-size step changes it again. A hard-coded 80px was 40-odd pixels short on a
 * 402px-wide phone, which pinned the strip *underneath* the bar and hid it entirely.
 *
 * A ref callback rather than an effect. React runs it when the node attaches and runs
 * the returned cleanup when the node leaves, which is exactly the lifetime of the
 * measurement — no dependency array to get wrong, and nothing to re-synchronise.
 * STANDARDS.md allows an effect for this; it needs less than one.
 */
export function publishHeightTo(property: string): RefCallback<HTMLElement> {
  return (node) => {
    if (!node) return undefined

    const root = node.ownerDocument.documentElement
    const publish = (): void => {
      root.style.setProperty(property, `${String(node.offsetHeight)}px`)
    }

    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(node)

    return () => {
      observer.disconnect()
      // Back to the stylesheet's fallback rather than a stale measurement of an
      // element that is no longer on the page.
      root.style.removeProperty(property)
    }
  }
}
