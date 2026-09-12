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
 * announced, and the keyboard has to reach it (STANDARDS.md §5). The 38px height plus
 * the surrounding gap clears the 44px hit area.
 */
export function Chip({ children, selected, onToggle, className }: ChipProps): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'squircle min-h-[38px] rounded-md border px-3.5 py-2',
        'text-label tracking-wide-label font-mono',
        'cursor-pointer transition-colors duration-300',
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
