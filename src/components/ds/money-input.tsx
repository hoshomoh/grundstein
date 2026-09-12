import { useRef, useState, type ReactElement } from 'react'

import type { Money } from '@/domain/money'
import { formatNumber, parseMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export type MoneyInputProps = {
  value: Money
  onCommit: (value: Money) => void
  /** Names the field for screen readers when the visible label sits elsewhere. */
  label: string
  id?: string
  className?: string
}

/**
 * A money field that shows a grouped figure at rest and gets out of the way while
 * being typed in.
 *
 * The problem it solves: reformatting on every keystroke fights the typist. Type "6"
 * into a field that immediately renders "6" as "6", then "60" as "60", then "600" as
 * "600" — fine — but "6000" becomes "6.000" and the caret jumps. So while the field
 * holds a draft it shows exactly what was typed, and only on blur is the draft read,
 * committed and reformatted.
 *
 * An unreadable draft commits nothing and snaps back to the last good figure, rather
 * than wiping the price to zero (STANDARDS.md §4). The draft is transient UI state, so
 * it is `useState` and the displayed text is computed during render — no effect
 * anywhere (§5).
 */
export function MoneyInput({
  value,
  onCommit,
  label,
  id,
  className,
}: MoneyInputProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  /* Escape has to blur to give focus back, and blurring fires onBlur — which would
   * commit the very draft Escape is abandoning, because setDraft has not applied yet.
   * A ref carries the intent across that synchronous gap; state cannot. */
  const abandoning = useRef(false)

  const displayed = draft ?? formatNumber(value)

  function commit(): void {
    if (abandoning.current) {
      abandoning.current = false
      setDraft(null)
      return
    }
    if (draft === null) return

    const parsed = parseMoney(draft)
    setDraft(null)
    if (parsed) onCommit(parsed)
  }

  return (
    <input
      id={id}
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
        // Enter commits by leaving the field, which is the same path as clicking away.
        if (event.key === 'Enter') event.currentTarget.blur()
        // Escape abandons the draft and restores the committed figure.
        if (event.key === 'Escape') {
          abandoning.current = true
          event.currentTarget.blur()
        }
      }}
      className={cn(
        'border-rule text-ink min-h-11 w-full border-0 border-b bg-transparent py-2.5',
        'font-mono text-base transition-colors duration-300',
        'focus:border-shu focus:outline-none',
        className,
      )}
    />
  )
}
