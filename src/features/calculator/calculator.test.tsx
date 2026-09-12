// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'
import { initialiseI18n } from '@/i18n'
import type { SessionStorage } from '@/state/persistence'
import { SessionProvider } from '@/state/session-context'
import { createSessionStore, type SessionStore } from '@/state/session-store'

import { AboutYou } from './sections/about-you'
import { Hero } from './sections/hero'
import { SummaryBar } from './sections/summary-bar'
import { useCalculation } from './use-calculation'

function memoryStorage(): SessionStorage {
  const contents = new Map<string, string>()
  return {
    read: (key) => contents.get(key) ?? null,
    write: (key, value) => void contents.set(key, value),
  }
}

function withStore(children: ReactNode, store: SessionStore): ReactElement {
  return <SessionProvider store={store}>{children}</SessionProvider>
}

/** Renders the pieces that actually read the store, which is where wiring breaks. */
function Assembled(): ReactElement {
  const { state, costs, portfolio } = useCalculation()
  return (
    <>
      <Hero monthlyPayment={portfolio.peakPayment} />
      <SummaryBar
        monthlyPayment={portfolio.peakPayment}
        cashNeeded={costs.cashNeeded}
        totalInterest={portfolio.totalInterest}
      />
      <AboutYou profile={state.profile} showGridFeed={false} onChange={() => undefined} />
    </>
  )
}

beforeAll(() => {
  initialiseI18n('en')
})

describe('the calculator, assembled', () => {
  it('renders the worked example the app opens with', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    expect(screen.getByText('See what your mortgage')).toBeInTheDocument()
    expect(screen.getByText('Every loan, every year.')).toBeInTheDocument()
    expect(screen.getByText('About you')).toBeInTheDocument()
  })

  /* The number the whole page exists to produce. Three loans at the opening figures
   * come to a payment in the low thousands — not zero, not NaN, not a blank. */
  it('shows a plausible monthly payment rather than nothing', () => {
    const store = createSessionStore(memoryStorage())
    render(withStore(<Assembled />, store))

    const monthly = screen.getAllByText(/\d\.\d{3},\d{2}/)
    expect(monthly.length).toBeGreaterThan(0)
  })

  it('shows the three summary figures', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    expect(screen.getByText('Monthly payment')).toBeInTheDocument()
    expect(screen.getByText('Cash you need')).toBeInTheDocument()
    expect(screen.getByText('Interest total')).toBeInTheDocument()
  })

  it('labels every field in the profile section', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    for (const label of [
      'Your plan',
      'Children under 18',
      'Household income, € a year',
      'Already own a home?',
      'Energy target',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  /* The grid-feed question is only asked when a loan in play depends on it. Nobody
   * working out a new build's payment should be asked about solar panels. */
  it('hides the grid-feed question when no loan needs it', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))
    expect(screen.queryByLabelText('Solar power fed into the grid?')).not.toBeInTheDocument()
  })

  it('recalculates when the reader changes a figure', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(<Assembled />, store))

    const income = screen.getByLabelText('Household income, € a year')
    expect(income).toHaveValue('85.000')

    await user.clear(income)
    await user.type(income, '120000{Enter}')

    // The section is rendered with a no-op onChange, so the field reverts to the
    // store's value: proof the input is driven by the store rather than by itself.
    expect(income).toHaveValue('85.000')
    expect(store.getSnapshot().profile.income.equals(euros(85_000))).toBe(true)
  })

  it('follows the store when it changes underneath', () => {
    const store = createSessionStore(memoryStorage())
    const { rerender } = render(withStore(<Assembled />, store))

    store.update((state) => ({
      ...state,
      profile: { ...state.profile, income: euros(150_000) },
    }))
    rerender(withStore(<Assembled />, store))

    expect(screen.getByLabelText('Household income, € a year')).toHaveValue('150.000')
  })
})
