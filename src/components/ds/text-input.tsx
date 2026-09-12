import { useRef, useState, type ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type TextInputProps = {
  value: string
  onCommit: (value: string) => void
  label: string
  className?: string
}

/**
 * A free-text field that commits when the reader stops typing, not during.
 *
 * Committing per keystroke would re-derive every loan's schedule on each letter of a
 * renamed tranche. Same contract as MoneyInput: draft while focused, commit on blur or
 * Enter, abandon on Escape.
 */
export function TextInput({ value, onCommit, label, className }: TextInputProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  const abandoning = useRef(false)

  function commit(): void {
    if (abandoning.current) {
      abandoning.current = false
      setDraft(null)
      return
    }
    if (draft === null) return

    const trimmed = draft.trim()
    setDraft(null)
    // An empty name would leave an anonymous row; keeping the old one is kinder.
    if (trimmed !== '') onCommit(trimmed)
  }

  return (
    <input
      type="text"
      autoComplete="off"
      aria-label={label}
      value={draft ?? value}
      onChange={(event) => {
        setDraft(event.target.value)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          abandoning.current = true
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'font-display min-w-0 border-0 border-b border-transparent bg-transparent py-0.75 leading-none',
        'hover:border-rule focus:border-shu transition-colors duration-300 focus:outline-none',
        className,
      )}
    />
  )
}
