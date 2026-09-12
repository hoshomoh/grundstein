import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'

import { TopBar } from '@/components/ds'
import type { Profile, ProgrammeKey, Tranche } from '@/domain/types'
import { AboutYou } from '@/features/calculator/sections/about-you'
import { Hero } from '@/features/calculator/sections/hero'
import { SummaryBar } from '@/features/calculator/sections/summary-bar'
import { TheProperty, type PropertyPatch } from '@/features/calculator/sections/the-property'
import { Questions } from '@/features/calculator/sections/questions'
import { SiteFooter } from '@/features/calculator/sections/site-footer'
import { WhatEachLoanCosts } from '@/features/calculator/sections/what-each-loan-costs'
import { YearByYear } from '@/features/calculator/sections/year-by-year'
import { YourLoans } from '@/features/calculator/sections/your-loans'
import { useCalculation } from '@/features/calculator/use-calculation'
import type { Language } from '@/i18n/locales'
import { createPrefersDarkStore, nextTheme, resolveDark } from '@/lib/appearance'
import { useSessionStore } from '@/state/session-context'
import {
  addTranche,
  removeTranche,
  withDown,
  withPrice,
  withTranche,
  type FontScale,
} from '@/state/session-state'
import { useSyncExternalStore } from 'react'

export const Route = createFileRoute('/')({
  component: CalculatorRoute,
})

const prefersDarkStore = createPrefersDarkStore(typeof window === 'undefined' ? undefined : window)

function CalculatorRoute(): ReactElement {
  const { t } = useTranslation()
  const store = useSessionStore()
  const { state, costs, portfolio, cover, conflicts, conflictedTrancheIds } = useCalculation()

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
        brand={<Wordmark subtitle={t('nav.subtitle')} />}
      />

      <div id="content" tabIndex={-1}>
        <Hero monthlyPayment={portfolio.peakPayment} />
      </div>

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

      <TheProperty
        price={state.price}
        down={state.down}
        stateCode={state.stateCode}
        notaryPercent={state.notaryPercent}
        registryPercent={state.registryPercent}
        agentPercent={state.agentPercent}
        agentInvolved={state.agentInvolved}
        costs={costs}
        onChange={(patch: PropertyPatch) => {
          store.update((current) => {
            const next = { ...current, ...patch }
            // The down payment can never exceed the price, whichever of the two moved.
            if (patch.price) return withPrice(next, patch.price)
            if (patch.down) return withDown(next, patch.down)
            return next
          })
        }}
      />

      <YourLoans
        tranches={state.tranches}
        programmes={state.programmes}
        programmeOrder={state.programmeOrder}
        profile={state.profile}
        rows={portfolio.rows}
        down={state.down}
        cover={cover}
        conflicts={conflicts}
        conflictedTrancheIds={conflictedTrancheIds}
        onTrancheChange={(id: number, patch: Partial<Tranche>) => {
          store.update((current) => withTranche(current, id, patch))
        }}
        onTrancheRemove={(id: number) => {
          store.update((current) => removeTranche(current, id))
        }}
        onTrancheAdd={(key: ProgrammeKey) => {
          store.update((current) => addTranche(current, key))
        }}
        onReset={() => {
          store.reset()
        }}
      />

      <YearByYear portfolio={portfolio} />

      <WhatEachLoanCosts portfolio={portfolio} programmes={state.programmes} />

      <Questions />

      <SiteFooter />
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
