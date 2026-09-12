import type { ReactElement, ReactNode } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

export type DisclosureItem = {
  id: string
  /** The row itself: a question, or a programme name with its figures. */
  summary: ReactNode
  content: ReactNode
}

export type DisclosureProps = {
  items: readonly DisclosureItem[]
  className?: string
}

/**
 * The hairline-ruled expanding list used for the FAQ and the Library.
 *
 * On shadcn's Accordion, so each row is a real button with `aria-expanded` and the
 * arrow keys move between them — which `<details>` does not give you. The plus sign
 * rotating into a cross is the generated chevron replaced through a `data-slot`
 * selector, leaving `ui/accordion.tsx` untouched.
 */
export function Disclosure({ items, className }: DisclosureProps): ReactElement {
  return (
    <Accordion type="multiple" className={cn('border-rule border-t', className)}>
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} className="border-rule-2 border-b">
          <AccordionTrigger
            className={cn(
              'hover:text-shu text-md py-5 hover:no-underline',
              'items-baseline gap-4 transition-[color,box-shadow] duration-150 ease-(--ease-gs)',
              // The generated chevron is replaced by a plus that rotates to a cross.
              '[&_[data-slot=accordion-trigger]>svg]:hidden',
              '[&>svg]:hidden',
            )}
          >
            <span className="min-w-0 flex-1 text-left">{item.summary}</span>
            <PlusMark />
          </AccordionTrigger>

          <AccordionContent className="text-ink-2 max-w-[64ch] pb-6 text-sm">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function PlusMark(): ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden
      className={cn(
        'text-ink-3 shrink-0 transition-transform duration-500 ease-(--ease-gs)',
        'in-data-[state=open]:rotate-45',
      )}
    >
      <path d="M12 5.2v13.6M5.2 12h13.6" />
    </svg>
  )
}
