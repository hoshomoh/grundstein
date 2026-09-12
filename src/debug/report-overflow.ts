/**
 * Names every element sticking out past the right edge of the page, on screen.
 *
 * A temporary diagnostic, loaded only for `?debug=overflow` and only as a dynamic
 * import, so it costs nothing in a normal load. It exists because a phone has no
 * console: the reader opens the URL, reads the list off the panel, and we get a
 * measurement instead of a guess about which element is widening the page.
 *
 * Delete this file and its call in main.tsx once the cause is found.
 */

/** Enough of an element to find it in the source. */
function describe(element: Element): string {
  const id = element.id ? `#${element.id}` : ''
  const slot = element.getAttribute('data-slot')
  const classes = [...element.classList].slice(0, 3).join('.')
  return `${element.tagName.toLowerCase()}${id}${slot === null ? '' : `[${slot}]`}${classes === '' ? '' : `.${classes}`}`
}

type Offender = {
  past: number
  line: string
}

function scan(): Offender[] {
  const limit = document.documentElement.clientWidth
  const found: Offender[] = []

  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue

    const past = Math.max(rect.right - limit, -rect.left)
    if (past <= 0.5) continue

    found.push({
      past,
      line: `+${String(Math.round(past))}px  ${describe(element)}  [${String(Math.round(rect.left))}→${String(Math.round(rect.right))}, w${String(Math.round(rect.width))}]`,
    })
  }

  return found.sort((a, b) => b.past - a.past).slice(0, 30)
}

function show(): void {
  const root = document.documentElement
  const panel = document.createElement('pre')
  panel.style.cssText = [
    'position:fixed',
    'inset:auto 0 0 0',
    'max-height:60vh',
    'max-width:100%',
    'overflow:auto',
    'margin:0',
    'padding:10px 12px',
    'z-index:2147483647',
    'background:#111',
    'color:#0f0',
    'font:11px/1.45 ui-monospace,monospace',
    'white-space:pre-wrap',
    'word-break:break-all',
  ].join(';')

  const offenders = scan()
  const header = `viewport ${String(root.clientWidth)}  scrollWidth ${String(root.scrollWidth)}  overflow ${String(root.scrollWidth - root.clientWidth)}px\n(tap to close)\n\n`
  panel.textContent =
    header +
    (offenders.length === 0 ? 'nothing past the edge' : offenders.map((o) => o.line).join('\n'))

  panel.addEventListener('click', () => {
    panel.remove()
  })
  document.body.append(panel)
}

export function reportOverflow(): void {
  // Two frames, so fonts have swapped in and the sticky bar has measured itself.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(show, 400)
    })
  })
}
