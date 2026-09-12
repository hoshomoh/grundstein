import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { TopBar } from '@/components/ds'
import type { Profile } from '@/domain/types'
import { AboutYou } from '@/features/calculator/sections/about-you'
import { Hero } from '@/features/calculator/sections/hero'
import { SummaryBar } from '@/features/calculator/sections/summary-bar'
import { useCalculation } from '@/features/calculator/use-calculation'
import type { Language } from '@/i18n/locales'
import { createPrefersDarkStore, nextTheme, resolveDark } from '@/lib/appearance'
import { useSessionStore } from '@/state/session-context'
import type { FontScale } from '@/state/session-state'
import { useSyncExternalStore } from 'react'

export const Route = createFileRoute('/')({
  component: CalculatorRoute,
})

const prefersDarkStore = createPrefersDarkStore(typeof window === 'undefined' ? undefined : window)

function CalculatorRoute(): ReactElement {
  const { t } = useTranslation()
  const store = useSessionStore()
  const { state, costs, portfolio } = useCalculation()

  const systemPrefersDark = useSyncExternalStore(
    prefersDarkStore.subscribe,
    prefersDarkStore.getSnapshot,
    prefersDarkStore.getSnapshot,
  )

  const showGridFeed = state.tranches.some(
    (tranche) => state.programmes[tranche.programmeKey]?.requiresGridFeed === true,
  )

  return (
    <main className="bg-paper text-ink min-h-screen">
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
        brand={<Wordmark subtitle={t('nav.subtitle')} />}
      />

      <Hero monthlyPayment={portfolio.peakPayment} />

      <SummaryBar
        monthlyPayment={portfolio.peakPayment}
        cashNeeded={costs.cashNeeded}
        totalInterest={portfolio.totalInterest}
      />

      <AboutYou
        profile={state.profile}
        showGridFeed={showGridFeed}
        onChange={(patch: Partial<Profile>) => {
          store.update((current) => ({ ...current, profile: { ...current.profile, ...patch } }))
        }}
      />
    </main>
  )
}

type WordmarkProps = {
  subtitle: string
}

function Wordmark({ subtitle }: WordmarkProps): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <span aria-hidden className="bg-shu squircle size-2.75 shrink-0 rounded-xs" />
      <span className="font-display text-md tracking-wordmark">Grundstein</span>
      <span className="text-ink-3 text-label tracking-wide-label truncate font-mono uppercase">
        {subtitle}
      </span>
    </div>
  )
}
