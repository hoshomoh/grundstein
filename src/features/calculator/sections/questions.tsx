import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { Disclosure, type DisclosureItem } from '@/components/ds'

import { SectionHeading } from './section-heading'

type FaqEntry = {
  q: string
  paras: string[]
}

/** Section 006: the questions the figures above tend to raise. */
export function Questions(): ReactElement {
  const { t } = useTranslation()
  const entries = t('faq', { returnObjects: true }) as FaqEntry[]

  const items: DisclosureItem[] = entries.map((entry, index) => ({
    id: `faq-${String(index)}`,
    summary: entry.q,
    content: (
      <>
        {entry.paras.map((para, paraIndex) => (
          <p key={paraIndex} className="mb-3.5 last:mb-0">
            {para}
          </p>
        ))}
      </>
    ),
  }))

  return (
    <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-(--spacing-section-lg)">
      <SectionHeading number="006" className="mb-[clamp(20px,4vw,34px)]">
        {t('sections.terms')}
      </SectionHeading>

      <Disclosure items={items} />
    </section>
  )
}
