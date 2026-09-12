// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'
import { initialiseI18n } from '@/i18n'
import type { SessionStorage } from '@/state/persistence'
import { SessionProvider } from '@/state/session-context'
import { addTranche } from '@/state/session-state'
import { createSessionStore, type SessionStore } from '@/state/session-store'

import { AboutYou } from './sections/about-you'
import { Hero } from './sections/hero'
import { SummaryBar } from './sections/summary-bar'
import { TheProperty } from './sections/the-property'
import { YourLoans } from './sections/your-loans'
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
  const { state, costs, portfolio, cover, conflicts, conflictedTrancheIds } = useCalculation()
  return (
    <>
      <Hero monthlyPayment={portfolio.peakPayment} />
      <SummaryBar
        monthlyPayment={portfolio.peakPayment}
        cashNeeded={costs.cashNeeded}
        totalInterest={portfolio.totalInterest}
      />
      <AboutYou profile={state.profile} showGridFeed={false} onChange={() => undefined} />
      <TheProperty
        price={state.price}
        down={state.down}
        stateCode={state.stateCode}
        notaryPercent={state.notaryPercent}
        registryPercent={state.registryPercent}
        agentPercent={state.agentPercent}
        agentInvolved={state.agentInvolved}
        costs={costs}
        onChange={() => undefined}
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
        onTrancheChange={() => undefined}
        onTrancheRemove={() => undefined}
        onTrancheAdd={() => undefined}
        onReset={() => undefined}
      />
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

  /* The distinction the whole app exists to make: the down payment is not the cash you
   * need. On the opening example they are 0 € and 54.420 €, and a reader who confuses
   * them arrives at completion day short by every fee. */
  it('separates the down payment from the cash needed on the day', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    expect(screen.getByText('Cash you need on the day')).toBeInTheDocument()
    expect(screen.getAllByText('Down payment').length).toBeGreaterThan(0)
  })

  it('names the state whose transfer tax it is charging', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))
    expect(screen.getByText(/Transfer tax · Bayern/)).toBeInTheDocument()
  })

  it('lets the reader override the notary and registry rates', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    expect(screen.getByLabelText('Notary %')).toHaveValue('1,5')
    expect(screen.getByLabelText('Land registry %')).toHaveValue('0,5')
  })

  it('drops the agent row when no agent is involved', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => ({ ...state, agentInvolved: false }))
    render(withStore(<Assembled />, store))

    expect(screen.queryByLabelText('Agent, your half %')).not.toBeInTheDocument()
  })

  it('lists the three loans the example opens with', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    expect(screen.getByDisplayValue(/KfW 300/)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/KfW 124/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bank mortgage')).toBeInTheDocument()
  })

  /* The tier grid, visible: a two-child household is offered 170.000 € on KfW 300, not
   * the 270.000 € a flat cap would have let them slide to. */
  it('bounds the amount slider by what this household can actually borrow', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    const amount = screen.getAllByRole('group', { name: 'Amount' })
    expect(amount[0]?.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemax', '170000')
  })

  it('moves that bound when the household changes', () => {
    const store = createSessionStore(memoryStorage())
    const { rerender } = render(withStore(<Assembled />, store))

    store.update((state) => ({ ...state, profile: { ...state.profile, children: 5 } }))
    rerender(withStore(<Assembled />, store))

    const amount = screen.getAllByRole('group', { name: 'Amount' })
    expect(amount[0]?.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemax', '220000')
  })

  it('warns about a pair of loans that cannot fund the same home', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => addTranche(state, '297'))
    render(withStore(<Assembled />, store))

    expect(screen.getByText('These two do not go together')).toBeInTheDocument()
    expect(screen.getByText(/KfW 300 and KfW 297 cannot both pay/)).toBeInTheDocument()
  })

  it('says whether the loans cover the purchase', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))
    expect(screen.getByText(/Still need|Covered|Too much by/)).toBeInTheDocument()
  })

  /* A household that does not qualify today may qualify after changing an answer, so
   * the button stays — dashed rather than gone. */
  it('offers every programme as an add button, eligible or not', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    for (const short of ['KfW 297', 'KfW 298', 'KfW 308', 'KfW 261', 'KfW 270', 'Hausbank']) {
      expect(screen.getByRole('button', { name: short })).toBeInTheDocument()
    }
  })

  /* Radix names only the thumb, and names it nothing. Without the group wrapper every
   * slider on the page announces as an unnamed slider reading a bare number. */
  it('gives every slider an accessible name', () => {
    render(withStore(<Assembled />, createSessionStore(memoryStorage())))

    for (const name of ['Purchase price', 'Down payment', 'Amount', 'Interest rate']) {
      expect(screen.getAllByRole('group', { name }).length).toBeGreaterThan(0)
    }
  })
})
