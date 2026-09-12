import type { ReactElement, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type SectionHeadingProps = {
  /** The 001–006 marker the design numbers sections with. */
  number: string
  children: ReactNode
  /** Anything sitting at the far end of the row, such as a chart legend. */
  trailing?: ReactNode
  className?: string
}

export function SectionHeading({
  number,
  children,
  trailing,
  className,
}: SectionHeadingProps): ReactElement {
  return (
    <div
      className={cn(
        'mb-[clamp(28px,4vw,46px)] flex flex-wrap items-baseline gap-x-4.5 gap-y-3',
        className,
      )}
    >
      <span aria-hidden className="text-shu text-label tracking-label font-mono">
        {number}
      </span>
      <h2 className="font-display text-h2 m-0 font-normal">{children}</h2>
      {trailing ? <div className="ml-auto">{trailing}</div> : null}
    </div>
  )
}
