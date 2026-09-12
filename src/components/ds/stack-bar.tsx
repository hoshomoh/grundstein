import type { ReactElement } from 'react'

export type StackSegment = {
  /** Stable across renders, so a re-order does not restart the growth animation. */
  id: string
  /** CSS width, already a percentage string. */
  width: string
  /** A token-backed colour, e.g. `var(--band-1)`. */
  colour: string
  /** The legend label; also the segment's accessible description. */
  label: string
  title: string
}

export type StackBarProps = {
  segments: readonly StackSegment[]
  /** Describes the whole bar for a screen reader. */
  label: string
  className?: string
}

/**
 * The capital-structure bar: every tranche plus the buyer's own money, as one row.
 *
 * The bar itself is decoration — `aria-hidden` — because a row of coloured divs tells
 * a screen reader nothing. The same information is in the legend beneath it as text,
 * which is the accessible path (CONTEXT.md, "Readout").
 */
export function StackBar({ segments, label, className }: StackBarProps): ReactElement {
  return (
    <div className={className}>
      <div aria-hidden className="squircle mb-2.5 flex h-[22px] gap-px overflow-hidden rounded-sm">
        {segments.map((segment) => (
          <div
            key={segment.id}
            title={segment.title}
            className="min-w-0 transition-[width] duration-500 ease-(--ease-gs)"
            style={{ width: segment.width, background: segment.colour }}
          />
        ))}
      </div>

      <ul
        aria-label={label}
        className="flex list-none flex-wrap items-baseline gap-x-5 gap-y-1.5 p-0"
      >
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="text-ink-2 text-label inline-flex items-center gap-2 font-mono"
          >
            <span
              aria-hidden
              className="squircle size-2.5 shrink-0 rounded-xs"
              style={{ background: segment.colour }}
            />
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
