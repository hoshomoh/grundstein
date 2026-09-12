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
          // The generated trigger sets its height as `data-[size=default]:h-8`, an
          // attribute selector that outranks a plain `h-*` class. Matching the variant
          // puts both in one tailwind-merge group, so this one replaces it outright
          // instead of losing the cascade and leaving the select 12px shorter than the
          // inputs beside it.
          'h-(--gs-field-h) data-[size=default]:h-(--gs-field-h)',
          'border-rule text-ink w-full rounded-none border-0 border-b bg-transparent px-0 py-0',
          'text-base shadow-none transition-colors duration-150',
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
