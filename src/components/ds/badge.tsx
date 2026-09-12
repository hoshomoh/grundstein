import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type BadgeTone = 'kfw' | 'bank' | 'ok' | 'warn' | 'total'

export type BadgeProps = {
  children: ReactNode
  tone: BadgeTone
  /** An icon rendered before the label, already sized. */
  icon?: ReactNode
  /** Draws the outline. Without it the badge is just coloured text. */
  outlined?: boolean
  title?: string
  className?: string
}

const TONES: Readonly<Record<BadgeTone, string>> = {
  kfw: 'text-shu',
  bank: 'text-ink-3',
  ok: 'text-moku',
  warn: 'text-shu',
  total: 'text-shu',
}

const OUTLINES: Readonly<Record<BadgeTone, string>> = {
  kfw: 'border-shu',
  bank: 'border-rule',
  ok: 'border-moku',
  warn: 'border-shu',
  total: 'border-shu',
}

/** The small mono uppercase marker: "KfW", "Bank", "You probably qualify". */
export function Badge({
  children,
  tone,
  icon,
  outlined = false,
  title,
  className,
}: BadgeProps): ReactElement {
  return (
    <span
      title={title}
      className={cn(
        'text-label tracking-label inline-flex shrink-0 items-center gap-1.5 font-mono uppercase',
        TONES[tone],
        outlined && cn('squircle rounded-sm border px-2.5 py-1 whitespace-nowrap', OUTLINES[tone]),
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  )
}
