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
 */
export function Callout({ title, children, className }: CalloutProps): ReactElement {
  return (
    <div
      role="status"
      className={cn(
        'border-shu text-shu squircle rounded-xl border px-4.5 py-4',
        'text-xs leading-relaxed',
        className,
      )}
    >
      <div className="text-label tracking-label mb-2 flex items-center gap-2 font-mono uppercase">
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
