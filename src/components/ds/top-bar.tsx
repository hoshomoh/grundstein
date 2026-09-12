import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { LANGUAGE_LABELS, LANGUAGES, type Language } from '@/i18n/locales'
import { cn } from '@/lib/utils'
import { FONT_SCALES, type FontScale } from '@/state/session-state'

export type TopBarProps = {
  language: Language
  onLanguage: (language: Language) => void
  fontScale: FontScale
  onFontScale: (scale: FontScale) => void
  /** What is on screen now, not what is stored — `auto` resolves before it gets here. */
  isDark: boolean
  onToggleTheme: () => void
  /** The wordmark and whatever sits beside it. */
  brand: ReactElement
  className?: string
}

/** The A/A/A control renders one glyph per step, sized to show the difference. */
const SCALE_GLYPH_PX: Readonly<Record<FontScale, number>> = { 1: 12, 1.15: 14, 1.32: 16.5 }

/**
 * Language, text size and appearance, in the strip above everything.
 *
 * Each control is a real button and each says what it does. The text-size buttons are
 * a labelled radio group rather than three anonymous As, because "A" read aloud three
 * times running tells nobody anything.
 *
 * The A/A/A glyph sizes are the one place a font-size literal is allowed to live in a
 * component: they are illustrating the sizes rather than using them, so a token would
 * make them scale with the very setting they are demonstrating.
 */
export function TopBar({
  language,
  onLanguage,
  fontScale,
  onFontScale,
  isDark,
  onToggleTheme,
  brand,
  className,
}: TopBarProps): ReactElement {
  const { t } = useTranslation()

  return (
    <div className={cn('border-rule-2 animate-gs-fade border-b', className)}>
      <div
        className={cn(
          'mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between',
          'gap-x-4.5 gap-y-3 px-(--spacing-gutter) py-4.5',
        )}
      >
        {brand}

        <div className="flex shrink-0 items-center gap-0.5">
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              aria-current={code === language ? 'true' : undefined}
              onClick={() => {
                onLanguage(code)
              }}
              className={cn(
                'text-label tracking-wide-label min-h-11 cursor-pointer px-2.5 py-2 font-mono',
                'border-b bg-transparent transition-colors duration-300',
                code === language ? 'border-shu text-ink' : 'text-ink-3 border-transparent',
              )}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          ))}

          <div
            role="radiogroup"
            aria-label={t('nav.textSize')}
            className="border-rule squircle ml-3 flex shrink-0 items-stretch overflow-hidden rounded-lg border"
          >
            {FONT_SCALES.map((scale, index) => (
              <button
                key={scale}
                type="button"
                role="radio"
                aria-checked={scale === fontScale}
                aria-label={`${t('nav.textSize')} ${String(index + 1)}`}
                onClick={() => {
                  onFontScale(scale)
                }}
                className={cn(
                  'h-[34px] min-w-9 cursor-pointer px-3 font-mono leading-none',
                  'transition-colors duration-300',
                  index < FONT_SCALES.length - 1 && 'border-rule border-r',
                  scale === fontScale ? 'bg-shu text-paper' : 'text-ink-3 bg-transparent',
                )}
                style={{ fontSize: `${String(SCALE_GLYPH_PX[scale])}px` }}
              >
                A
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            title={t('nav.themeToggle')}
            className={cn(
              'border-rule squircle text-ink-2 ml-3.5 flex h-[34px] items-center gap-1.5',
              'text-label tracking-wide-label rounded-lg border px-3.5 font-mono uppercase',
              'hover:border-ink hover:text-ink cursor-pointer bg-transparent transition-colors duration-300',
            )}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>{isDark ? t('nav.themeLight') : t('nav.themeDark')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function SunIcon(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
    </svg>
  )
}

function MoonIcon(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M20.2 14.8A8.6 8.6 0 0 1 9.2 3.8a6.9 6.9 0 1 0 11 11z" />
    </svg>
  )
}
