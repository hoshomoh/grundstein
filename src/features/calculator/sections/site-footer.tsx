import { Link } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { CATALOGUE_VERIFIED_ON } from '@/domain/programmes'
import { formatVerifiedOn } from '@/lib/dates'

/** The disclaimer, the sources, and when the figures were last checked. */
export function SiteFooter(): ReactElement {
  const { t, i18n } = useTranslation()
  const language = i18n.language === 'de' ? 'de' : 'en'

  return (
    <footer className="mx-auto max-w-(--container-page) px-(--spacing-gutter) pt-[clamp(70px,11vw,130px)] pb-[clamp(50px,8vw,80px)]">
      <div className="bg-rule mb-7 h-px" />

      <div className="flex flex-wrap items-start gap-x-12.5 gap-y-6">
        <div className="min-w-0 flex-1 basis-70">
          <div className="mb-3.5 flex items-center gap-2.75">
            <span aria-hidden className="bg-shu squircle size-2.25 shrink-0 rounded-xs" />
            <span className="font-display text-md tracking-wordmark">Grundstein</span>
          </div>
          <p className="text-ink-2 m-0 max-w-[46ch] text-xs">{t('footer.disclaimer')}</p>
        </div>

        <div className="basis-55">
          <div className="text-ink-3 text-label tracking-label mb-3.5 font-mono uppercase">
            {t('footer.sources')}
          </div>
          <div className="flex flex-col gap-2.5 text-xs">
            <a
              href="https://www.kfw.de/inlandsfoerderung/Privatpersonen/"
              target="_blank"
              rel="noopener noreferrer"
            >
              kfw.de ↗
            </a>
            <Link to="/library" className="text-ink-3 hover:text-shu">
              {t('footer.libraryLink')} →
            </Link>
            {/* When the ceilings and rules were last checked against source. A figure
                without a date is a rumour (STANDARDS.md §4). */}
            <span className="text-ink-3">
              {t('provenance.verifiedOn', {
                source: 'kfw.de',
                date: formatVerifiedOn(CATALOGUE_VERIFIED_ON, language),
              })}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
