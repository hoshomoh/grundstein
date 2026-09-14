import { Link, createFileRoute } from '@tanstack/react-router'
import { useSyncExternalStore, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog, Disclosure, TopBar, type DisclosureItem } from '@/components/ds'
import { CATALOGUE_VERIFIED_ON, highestCeiling } from '@/domain/programmes'
import type { Programme, ProgrammeKey, ProjectType } from '@/domain/types'
import { ProgrammeEditor } from '@/features/library/programme-editor'
import type { Language } from '@/i18n/locales'
import { formatEuros, formatPercent } from '@/lib/format'
import { createPrefersDarkStore, nextTheme, resolveDark } from '@/lib/appearance'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/state/session-context'
import {
  addProgramme,
  removeProgramme,
  restoreProgrammes,
  toggleProgrammeValue,
  withProgramme,
  type FontScale,
} from '@/state/session-state'
import { useSession } from '@/state/use-session'

export const Route = createFileRoute('/library')({
  component: LibraryRoute,
})

const prefersDarkStore = createPrefersDarkStore(typeof window === 'undefined' ? undefined : window)

/** The back room: every loan the calculator knows, and its terms. */
function LibraryRoute(): ReactElement {
  const { t } = useTranslation()
  const store = useSessionStore()
  const state = useSession(store)

  const systemPrefersDark = useSyncExternalStore(
    prefersDarkStore.subscribe,
    prefersDarkStore.getSnapshot,
    prefersDarkStore.getSnapshot,
  )

  const programmes = state.programmeOrder
    .map((key) => state.programmes[key])
    .filter((programme): programme is Programme => programme !== undefined)

  const items: DisclosureItem[] = programmes.map((programme) => ({
    id: programme.key,
    summary: (
      <span className="flex min-w-0 items-baseline gap-3">
        <span
          className={cn(
            'text-label tracking-wide-label shrink-0 font-mono uppercase',
            programme.isKfw ? 'text-shu' : 'text-ink-3',
          )}
        >
          {programme.isKfw ? 'KfW' : 'Bank'}
        </span>
        <span className="font-display min-w-0 text-lg">{programme.name}</span>
        <span className="text-ink-2 ml-auto shrink-0 font-mono text-xs tracking-[-0.02em]">
          {formatEuros(highestCeiling(programme.ceiling))} ·{' '}
          {formatPercent(programme.defaultRatePercent)}
        </span>
      </span>
    ),
    content: (
      <ProgrammeEditor
        programme={programme}
        others={programmes.filter((other) => other.key !== programme.key)}
        language={state.language}
        onChange={(patch: Partial<Programme>) => {
          store.update((current) => withProgramme(current, programme.key, patch))
        }}
        onToggleProjectType={(value: ProjectType) => {
          store.update((current) =>
            toggleProgrammeValue(current, programme.key, 'projectTypes', value),
          )
        }}
        onToggleExclusion={(value: ProgrammeKey) => {
          store.update((current) => toggleProgrammeValue(current, programme.key, 'excludes', value))
        }}
        onDelete={() => {
          store.update((current) => removeProgramme(current, programme.key))
        }}
      />
    ),
  }))

  return (
    <main className="bg-paper text-ink min-h-screen">
      {/* First in the tab order, invisible until focused: without it a keyboard
          reader crosses the whole top strip before reaching anything they came for. */}
      <a
        href="#content"
        className="bg-card text-ink border-shu focus:ring-shu sr-only rounded-md border px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        {t('meta.skipToContent')}
      </a>

      <TopBar
        language={state.language}
        onLanguage={(language: Language) => {
          store.update((current) => ({ ...current, language }))
        }}
        fontScale={state.fontScale}
        onFontScale={(fontScale: FontScale) => {
          store.update((current) => ({ ...current, fontScale }))
        }}
        isDark={resolveDark(state.theme, systemPrefersDark)}
        onToggleTheme={() => {
          store.update((current) => ({
            ...current,
            theme: nextTheme(current.theme, systemPrefersDark),
          }))
        }}
        brand={
          <Link to="/" className="text-ink hover:text-shu flex min-w-0 items-center gap-3.25">
            <span aria-hidden className="text-ink-3 font-mono text-xs">
              ←
            </span>
            <span className="font-display text-md tracking-wordmark">Grundstein</span>
          </Link>
        }
      />

      <header
        id="content"
        tabIndex={-1}
        className="mx-auto max-w-(--container-page-narrow) px-(--spacing-gutter) pt-[clamp(52px,10vh,96px)] pb-[clamp(34px,5vw,54px)]"
      >
        <p className="text-ink-3 text-label tracking-label mb-[clamp(26px,5vw,44px)] font-mono uppercase">
          {t('library.eyebrow')}
        </p>
        <h1 className="font-display text-h1 m-0 mb-6.5 max-w-[22ch] font-normal">
          {t('library.title')}
        </h1>
        <div className="bg-rule h-px" />
        <p className="text-ink-2 mt-6.5 max-w-[62ch] text-base">{t('library.lede')}</p>
      </header>

      <section className="mx-auto max-w-(--container-page-narrow) px-(--spacing-gutter) pb-[clamp(60px,10vw,110px)]">
        <Disclosure items={items} />

        <div className="mt-6.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              store.update((current) => addProgramme(current, CATALOGUE_VERIFIED_ON))
            }}
            className={cn(
              'border-rule squircle text-ink-2 inline-flex min-h-10.5 items-center gap-2 rounded-lg',
              'hover:border-shu hover:text-shu hover:bg-shu-soft cursor-pointer border border-dashed',
              'text-label tracking-label bg-transparent px-4 py-2.5 font-mono uppercase',
              'transition-colors duration-150',
            )}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden
              className="shrink-0"
            >
              <path d="M12 5.2v13.6M5.2 12h13.6" />
            </svg>
            {t('library.add')}
          </button>

          {/* Restoring is destructive to the reader's own programmes, so it asks. */}
          <ConfirmDialog
            title={t('library.restoreTitle')}
            body={t('library.restoreBody')}
            confirmLabel={t('library.restore')}
            onConfirm={() => {
              store.update(restoreProgrammes)
            }}
          >
            <button
              type="button"
              className={cn(
                'border-rule text-ink-3 hover:border-shu hover:text-shu ml-auto cursor-pointer',
                'border-0 border-b bg-transparent py-2',
                'text-label tracking-wide-label font-mono uppercase transition-colors duration-150',
              )}
            >
              {t('library.restore')}
            </button>
          </ConfirmDialog>
        </div>

        <div className="border-rule mt-[clamp(44px,7vw,76px)] flex flex-wrap items-baseline justify-between gap-x-7.5 gap-y-4 border-t pt-6">
          <p className="text-ink-2 m-0 max-w-[52ch] text-xs">{t('library.footerNote')}</p>
          <Link to="/" className="text-label tracking-label font-mono whitespace-nowrap uppercase">
            ← {t('library.back')}
          </Link>
        </div>
      </section>
    </main>
  )
}
