import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type ChipProps = {
  children: ReactNode
  /** Whether the chip is currently chosen. */
  selected: boolean
  onToggle: () => void
  className?: string
}

/**
 * A small toggle used for project types and exclusions in the Library.
 *
 * A real `<button>` with `aria-pressed`, not a styled div: the state has to be
 * announced, and the keyboard has to reach it (STANDARDS.md §5). It is a full 44px
 * tall: the design drew these at 38px, which is under the floor for a target someone
 * taps on a phone.
 */
export function Chip({ children, selected, onToggle, className }: ChipProps): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'squircle min-h-(--gs-hit) rounded-md border px-3.5 py-2',
        'text-label tracking-wide-label font-mono',
        'cursor-pointer transition-[color,background-color,border-color,transform] duration-150 ease-(--ease-gs) active:scale-[0.97]',
        selected
          ? 'border-shu bg-shu-soft text-shu'
          : 'border-rule text-ink-3 hover:border-ink hover:text-ink bg-transparent',
        className,
      )}
    >
      {children}
    </button>
  )
}
