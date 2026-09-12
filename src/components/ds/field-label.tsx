import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type FieldLabelProps = {
  children: ReactNode
  className?: string
}

/**
 * The small mono uppercase label above every field and beside every figure.
 *
 * A `<span>` rather than a `<label>`: most uses sit inside a `<label>` already, and
 * the ones that do not are labelling a Radix control that carries its own accessible
 * name. Nesting a label inside a label would give screen readers two.
 */
export function FieldLabel({ children, className }: FieldLabelProps): ReactElement {
  return (
    <span
      className={cn(
        'text-ink-3 text-label tracking-label font-mono uppercase',
        'block min-w-0 overflow-hidden text-ellipsis',
        className,
      )}
    >
      {children}
    </span>
  )
}
