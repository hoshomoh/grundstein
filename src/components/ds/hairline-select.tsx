import type { ReactElement } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SelectOption = {
  value: string
  label: string
}

export type HairlineSelectProps = {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  /** Names the control for screen readers when the visible label sits elsewhere. */
  label: string
  id?: string
  className?: string
}

/**
 * A select drawn as a single underline rather than a box.
 *
 * shadcn's Select is Radix underneath, so it keeps type-ahead, arrow-key navigation
 * and the listbox semantics that a restyled native `<select>` cannot be given
 * consistently across browsers. Only `data-slot` selectors are used, so the generated
 * component is untouched.
 */
export function HairlineSelect({
  value,
  options,
  onChange,
  label,
  id,
  className,
}: HairlineSelectProps): ReactElement {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          'border-rule text-ink h-11 w-full rounded-none border-0 border-b bg-transparent px-0',
          'text-base shadow-none transition-colors duration-300',
          'focus-visible:border-shu focus-visible:ring-0',
          '[&_[data-slot=select-value]]:truncate',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent className="border-rule bg-card squircle rounded-lg">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-base">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
