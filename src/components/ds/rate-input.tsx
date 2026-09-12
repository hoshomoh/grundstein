import { useRef, useState, type ReactElement } from 'react'

import { parseDecimal } from '@/lib/format'
import { cn } from '@/lib/utils'

export type RateInputProps = {
  value: number
  onCommit: (value: number) => void
  label: string
  /** Refuse anything above this, so a typo cannot set a 500% notary fee. */
  max?: number
  className?: string
}

/**
 * A small percentage field, for the fees a reader may need to override.
 *
 * Same contract as MoneyInput — it shows the draft while being typed in, commits on
 * blur or Enter, abandons on Escape, and commits nothing it cannot read — so the two
 * behave identically under the hand. See money-input.tsx for why the abandon flag is a
 * ref rather than state.
 */
export function RateInput({
  value,
  onCommit,
  label,
  max = 100,
  className,
}: RateInputProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  const abandoning = useRef(false)

  const displayed = draft ?? String(value).replace('.', ',')

  function commit(): void {
    if (abandoning.current) {
      abandoning.current = false
      setDraft(null)
      return
    }
    if (draft === null) return

    const parsed = parseDecimal(draft)
    setDraft(null)
    if (parsed !== null && parsed <= max) onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={label}
      value={displayed}
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
        'border-rule text-ink w-12 border-0 border-b bg-transparent py-1 text-right',
        'font-mono text-xs transition-colors duration-300',
        'focus:border-shu focus:outline-none',
        className,
      )}
    />
  )
}
