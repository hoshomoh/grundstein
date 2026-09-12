import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import type { Money } from '@/domain/money'
import { StatFigure } from '@/components/ds'
import { formatEurosWithCents } from '@/lib/format'

export type HeroProps = {
  monthlyPayment: Money
}

type Principle = {
  numeral: string
  title: string
  body: string
}

/** The opening: what the page is for, and the one number it exists to produce. */
export function Hero({ monthlyPayment }: HeroProps): ReactElement {
  const { t } = useTranslation()
  const principles = t('principles', { returnObjects: true }) as Principle[]

  return (
    <>
      <header className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-[clamp(64px,13vh,150px)] pb-[clamp(56px,9vw,110px)]">
        <p className="animate-gs-fade text-ink-3 text-label tracking-label mb-[clamp(40px,7vw,70px)] font-mono uppercase">
          {t('hero.eyebrow')}
        </p>

        <h1 className="font-display text-h1 mb-[clamp(38px,6vw,66px)] max-w-[21ch] font-normal tracking-[-0.01em]">
          <span className="animate-gs-in block">{t('hero.titleA')}</span>
          <span className="animate-gs-in block [animation-delay:0.08s]">{t('hero.titleB')}</span>
          <span className="animate-gs-in text-shu block [animation-delay:0.16s]">
            {t('hero.titleC')}
          </span>
        </h1>

        <div className="bg-rule animate-gs-rule h-px origin-left [animation-delay:0.28s]" />

        <div className="animate-gs-fade grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[clamp(28px,5vw,70px)] pt-8 [animation-delay:0.3s]">
          <p className="text-ink-2 m-0 max-w-[40ch] text-base">{t('hero.lede')}</p>

          <div className="self-start">
            <div className="text-ink-3 text-label mb-3.5 font-mono tracking-[0.15em] uppercase">
              {t('hero.stat')}
            </div>
            <div className="text-shu text-hero-figure font-mono tracking-[-0.035em]">
              <StatFigure text={formatEurosWithCents(monthlyPayment)} />
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pb-[clamp(56px,9vw,110px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[clamp(30px,5vw,60px)]">
          {principles.map((principle) => (
            <div key={principle.numeral}>
              <div className="font-display text-shu mb-5 text-base tracking-[0.15em]">
                {principle.numeral}
              </div>
              <h2 className="font-display mb-3.5 text-xl font-normal">{principle.title}</h2>
              <p className="text-ink-2 m-0 text-sm">{principle.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
