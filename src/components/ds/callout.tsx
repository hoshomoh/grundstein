import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type CalloutProps = {
  title: string
  children: ReactNode
  className?: string
}

/**
 * The bordered warning used for programme conflicts.
 *
 * `role="status"` rather than `role="alert"`: a conflict appears because the reader
 * just chose a loan, so they are already looking at it. An alert would interrupt a
 * screen reader mid-sentence for something they caused deliberately.
 *
 * The border and the title carry the vermilion; the body does not. A sentence set in
 * the accent at 13px is tiring to read even though it clears AA (6.10:1 on paper,
 * 5.89:1 on the dark ground), and it blooms against near-black. Ink for prose puts the
 * words at 7.3:1 and 8.6:1 without losing the alarm.
 */
export function Callout({ title, children, className }: CalloutProps): ReactElement {
  return (
    <div
      role="status"
      className={cn(
        'border-shu text-ink-2 squircle rounded-xl border px-4.5 py-4',
        'text-xs leading-relaxed',
        className,
      )}
    >
      <div className="text-shu text-label tracking-label mb-2 flex items-center gap-2 font-mono uppercase">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="shrink-0"
        >
          <path d="M12 3.8L21.6 20.2H2.4z" />
          <path d="M12 10.2v4.3M12 17.4v.1" />
        </svg>
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}
