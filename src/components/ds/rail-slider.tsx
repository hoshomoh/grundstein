import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'

export type RailSliderProps = {
  value: number
  min: number
  max: number
  step: number
  /** Names the control for screen readers; the visible label sits elsewhere. */
  label: string
  /** What a screen reader should read instead of the bare number. */
  valueText?: string
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

/**
 * The design's hairline slider: a 1px rule, a vermilion fill, and a small circle that
 * grows under the pointer.
 *
 * Built on shadcn's Radix slider rather than an `<input type=range>`, which is what
 * the design file used. Radix brings the keyboard map (arrows, Home/End, PageUp/Down),
 * the correct `role="slider"` with its aria-valuenow/min/max, and pointer capture that
 * survives dragging outside the track — all of which STANDARDS.md §5 asks for and none
 * of which a styled range input gives you without rebuilding it.
 *
 * The look comes entirely from `data-slot` selectors, so `ui/slider.tsx` stays exactly
 * as the generator wrote it.
 */
export function RailSlider({
  value,
  min,
  max,
  step,
  label,
  valueText,
  onChange,
  disabled,
  className,
}: RailSliderProps): ReactElement {
  return (
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={valueText}
      onValueChange={([next]) => {
        if (next !== undefined) onChange(next)
      }}
      className={cn(
        'h-10 py-0',
        // The track is a hairline, not a pill.
        '[&_[data-slot=slider-track]]:h-px [&_[data-slot=slider-track]]:rounded-none',
        '[&_[data-slot=slider-track]]:bg-rule [&_[data-slot=slider-track]]:overflow-visible',
        '[&_[data-slot=slider-range]]:bg-shu [&_[data-slot=slider-range]]:h-px',
        // The thumb: 13px, paper-filled, ink-outlined, growing on hover.
        '[&_[data-slot=slider-thumb]]:size-[13px] [&_[data-slot=slider-thumb]]:border',
        '[&_[data-slot=slider-thumb]]:border-ink [&_[data-slot=slider-thumb]]:bg-paper',
        '[&_[data-slot=slider-thumb]]:shadow-none [&_[data-slot=slider-thumb]]:ring-0',
        '[&_[data-slot=slider-thumb]]:transition-transform [&_[data-slot=slider-thumb]]:duration-300',
        '[&_[data-slot=slider-thumb]]:ease-(--ease-gs)',
        'hover:[&_[data-slot=slider-thumb]]:scale-130',
        'active:[&_[data-slot=slider-thumb]]:bg-shu active:[&_[data-slot=slider-thumb]]:border-shu',
        className,
      )}
    />
  )
}
