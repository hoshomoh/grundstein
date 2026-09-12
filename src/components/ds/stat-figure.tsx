import type { ReactElement } from 'react'

import { cn } from '@/lib/utils'

export type StatFigureProps = {
  /** The already-formatted figure, e.g. "1.548,10 €". */
  text: string
  className?: string
}

/** How far each digit column shifts per step, in ems. Also the column's height. */
const STEP_EM = 1.18

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function isDigit(character: string): boolean {
  return character >= '0' && character <= '9'
}

/**
 * A figure whose digits roll like a mechanical counter when it changes.
 *
 * Each digit is a full 0–9 column clipped to one row and translated into place, so a
 * change animates as a roll rather than a jump. The whole thing is derived from the
 * formatted string — there is no state and no timer.
 *
 * Accessibility: the columns would read to a screen reader as "0123456789" ten times
 * over, so the decorative markup is hidden and the real figure is exposed once as
 * text. Motion is CSS transition only, so the reduced-motion rule in index.css
 * flattens it to an instant change without any of this knowing.
 */
export function StatFigure({ text, className }: StatFigureProps): ReactElement {
  return (
    <span className={cn('inline-flex items-end tabular-nums', className)}>
      <span className="sr-only">{text}</span>

      <span
        aria-hidden
        className="inline-flex items-end"
        style={{ height: `${String(STEP_EM)}em` }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-misused-spread -- the text is
            a formatted number: digits, group separators and a currency symbol, none of
            which are surrogate pairs or grapheme clusters. */}
        {[...text].map((character, index) =>
          isDigit(character) ? (
            <span
              // The index is the identity here: this is a fixed-width display of one
              // string, and a digit's position is exactly what makes it that column.
              key={`${String(index)}-digit`}
              className="inline-block overflow-hidden align-bottom"
              style={{ height: `${String(STEP_EM)}em` }}
            >
              <span
                className="block transition-transform duration-700 ease-(--ease-gs-move)"
                style={{ transform: `translateY(-${String(Number(character) * STEP_EM)}em)` }}
              >
                {DIGITS.map((digit) => (
                  <span
                    key={digit}
                    className="block"
                    style={{ height: `${String(STEP_EM)}em`, lineHeight: `${String(STEP_EM)}em` }}
                  >
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span
              key={`${String(index)}-mark`}
              className="inline-block align-bottom whitespace-pre"
              style={{ height: `${String(STEP_EM)}em`, lineHeight: `${String(STEP_EM)}em` }}
            >
              {character === ' ' ? ' ' : character}
            </span>
          ),
        )}
      </span>
    </span>
  )
}
