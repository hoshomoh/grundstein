// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'
import { initialiseI18n } from '@/i18n'
import type { SessionStorage } from '@/state/persistence'
import { SessionProvider } from '@/state/session-context'
import { addTranche } from '@/state/session-state'
import { createSessionStore, type SessionStore } from '@/state/session-store'

import { AboutYou } from './sections/about-you'
import { Hero } from './sections/hero'
import { Questions } from './sections/questions'
import { SummaryBar } from './sections/summary-bar'
import { TheProperty } from './sections/the-property'
import { WhatEachLoanCosts } from './sections/what-each-loan-costs'
import { YearByYear } from './sections/year-by-year'
import { YourLoans } from './sections/your-loans'
import { useCalculation } from './use-calculation'

/* Each test renders only the section it is about.
 *
 * An earlier version rendered the whole page for every assertion — fourteen Radix
 * sliders, eight selects, twenty-five chart buttons and ten accordion items, a dozen
 * times over. On a loaded machine that timed out, which reported working code as
 * broken. A test that mounts the entire application to check one label is also telling
 * you nothing about where a break is. */

type Calculation = ReturnType<typeof useCalculation>

function memoryStorage(): SessionStorage {
  const contents = new Map<string, string>()
  return {
    read: (key) => contents.get(key) ?? null,
    write: (key, value) => void contents.set(key, value),
  }
}

function storeWith(change?: (store: SessionStore) => void): SessionStore {
  const store = createSessionStore(memoryStorage())
  change?.(store)
  return store
}

function mount(children: ReactNode, store: SessionStore = storeWith()): SessionStore {
  render(<SessionProvider store={store}>{children}</SessionProvider>)
  return store
}

type SectionProps = {
  show: (calculation: Calculation) => ReactNode
}

/** Renders one section against the live calculation, exactly as the route does. */
function Section({ show }: SectionProps): ReactNode {
  return show(useCalculation())
}

function section(show: SectionProps['show'], store?: SessionStore): SessionStore {
  return mount(<Section show={show} />, store)
}

beforeAll(() => {
  initialiseI18n('en')
})

describe('the hero', () => {
  it('opens with the headline and a live monthly figure', () => {
    section((c) => <Hero monthlyPayment={c.portfolio.peakPayment} />)

    expect(screen.getByText('See what your mortgage')).toBeInTheDocument()
    expect(screen.getByText('Every loan, every year.')).toBeInTheDocument()
    // Three loans at the opening figures: a payment in the low thousands.
    expect(screen.getAllByText(/\d\.\d{3},\d{2}/).length).toBeGreaterThan(0)
  })
})

describe('the summary bar', () => {
  it('shows the three figures that follow the reader down the page', () => {
    section((c) => (
      <SummaryBar
        monthlyPayment={c.portfolio.peakPayment}
        cashNeeded={c.costs.cashNeeded}
        totalInterest={c.portfolio.totalInterest}
      />
    ))

    expect(screen.getByText('Monthly payment')).toBeInTheDocument()
    expect(screen.getByText('Cash you need')).toBeInTheDocument()
    expect(screen.getByText('Interest total')).toBeInTheDocument()
  })

  /* The loans strip pins at `top: var(--gs-barh)`. If the bar stops publishing its own
   * height the strip falls back to the stylesheet's guess, and on any screen where the
   * bar wraps to two rows the strip pins underneath it and disappears. jsdom lays
   * nothing out, so only the wiring is checked here — the number is checked in a
   * browser. */
  it('publishes its height for the strip that pins beneath it', () => {
    section((c) => (
      <SummaryBar
        monthlyPayment={c.portfolio.peakPayment}
        cashNeeded={c.costs.cashNeeded}
        totalInterest={c.portfolio.totalInterest}
      />
    ))

    expect(document.documentElement.style.getPropertyValue('--gs-barh')).toMatch(/^\d+px$/)
  })
})

describe('about you', () => {
  function aboutYou(store?: SessionStore, showGridFeed = false): SessionStore {
    return section(
      (c) => (
        <AboutYou
          profile={c.state.profile}
          showGridFeed={showGridFeed}
          onChange={() => undefined}
        />
      ),
      store,
    )
  }

  it('labels every field', () => {
    aboutYou()

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

  /* Nobody working out a new build's payment should be asked about solar panels. */
  it('hides the grid-feed question when no loan needs it', () => {
    aboutYou()
    expect(screen.queryByLabelText('Solar power fed into the grid?')).not.toBeInTheDocument()
  })

  it('asks it when a loan does', () => {
    aboutYou(undefined, true)
    expect(screen.getByLabelText('Solar power fed into the grid?')).toBeInTheDocument()
  })

  it('is driven by the store, not by itself', async () => {
    const user = userEvent.setup({ delay: null })
    const store = aboutYou()

    const income = screen.getByLabelText('Household income, € a year')
    expect(income).toHaveValue('85.000')

    await user.clear(income)
    await user.type(income, '120000{Enter}')

    // Rendered with a no-op onChange, so it reverts to the store's value.
    expect(income).toHaveValue('85.000')
    expect(store.getSnapshot().profile.income.equals(euros(85_000))).toBe(true)
  })
})

describe('the property', () => {
  function property(store?: SessionStore): SessionStore {
    return section(
      (c) => (
        <TheProperty
          price={c.state.price}
          down={c.state.down}
          stateCode={c.state.stateCode}
          notaryPercent={c.state.notaryPercent}
          registryPercent={c.state.registryPercent}
          agentPercent={c.state.agentPercent}
          agentInvolved={c.state.agentInvolved}
          costs={c.costs}
          onChange={() => undefined}
        />
      ),
      store,
    )
  }

  /* The distinction the whole app exists to make. */
  it('separates the down payment from the cash needed on the day', () => {
    property()
    expect(screen.getByText('Cash you need on the day')).toBeInTheDocument()
    expect(screen.getAllByText('Down payment').length).toBeGreaterThan(0)
  })

  it('names the state whose transfer tax it is charging', () => {
    property()
    expect(screen.getByText(/Transfer tax · Bayern/)).toBeInTheDocument()
  })

  it('lets the reader override the notary and registry rates', () => {
    property()
    expect(screen.getByLabelText('Notary %')).toHaveValue('1,5')
    expect(screen.getByLabelText('Land registry %')).toHaveValue('0,5')
  })

  it('drops the agent row when no agent is involved', () => {
    property(
      storeWith((store) => {
        store.update((state) => ({ ...state, agentInvolved: false }))
      }),
    )
    expect(screen.queryByLabelText('Agent, your half %')).not.toBeInTheDocument()
  })

  it('gives the price and down-payment sliders accessible names', () => {
    property()
    expect(screen.getAllByRole('group', { name: 'Purchase price' })).toHaveLength(1)
    expect(screen.getAllByRole('group', { name: 'Down payment' })).toHaveLength(1)
  })
})

describe('your loans', () => {
  function loans(store?: SessionStore): SessionStore {
    return section(
      (c) => (
        <YourLoans
          tranches={c.state.tranches}
          programmes={c.state.programmes}
          programmeOrder={c.state.programmeOrder}
          profile={c.state.profile}
          rows={c.portfolio.rows}
          down={c.state.down}
          cover={c.cover}
          conflicts={c.conflicts}
          conflictedTrancheIds={c.conflictedTrancheIds}
          onTrancheChange={() => undefined}
          onTrancheRemove={() => undefined}
          onTrancheAdd={() => undefined}
          onReset={() => undefined}
        />
      ),
      store,
    )
  }

  it('lists the three loans the example opens with', () => {
    loans()
    expect(screen.getByDisplayValue(/KfW 300/)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/KfW 124/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Bank mortgage')).toBeInTheDocument()
  })

  /* The tier grid, visible: a two-child household is offered 170.000 € on KfW 300, not
   * the 270.000 € a flat cap would have let them slide to. */
  it('bounds the amount slider by what this household can actually borrow', () => {
    loans()
    const amount = screen.getAllByRole('group', { name: 'Amount' })
    expect(amount[0]?.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemax', '170000')
  })

  it('moves that bound when the household changes', () => {
    loans(
      storeWith((store) => {
        store.update((state) => ({ ...state, profile: { ...state.profile, children: 5 } }))
      }),
    )
    const amount = screen.getAllByRole('group', { name: 'Amount' })
    expect(amount[0]?.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemax', '220000')
  })

  it('warns about a pair of loans that cannot fund the same home', () => {
    loans(
      storeWith((store) => {
        store.update((state) => addTranche(state, '297'))
      }),
    )
    expect(screen.getByText('These two do not go together')).toBeInTheDocument()
    expect(screen.getByText(/KfW 300 and KfW 297 cannot both pay/)).toBeInTheDocument()
  })

  it('says whether the loans cover the purchase', () => {
    loans()
    expect(screen.getByText(/Still need|Covered|Too much by/)).toBeInTheDocument()
  })

  /* A household that does not qualify today may qualify after changing an answer, so
   * the button stays — dashed rather than gone. */
  it('offers every programme as an add button, eligible or not', () => {
    loans()
    for (const short of ['KfW 297', 'KfW 298', 'KfW 308', 'KfW 261', 'KfW 270', 'Hausbank']) {
      expect(screen.getByRole('button', { name: short })).toBeInTheDocument()
    }
  })

  /* The figure on screen must be one the household could actually be lent. */
  it('says so when a loan is held down to the household ceiling', () => {
    loans(
      storeWith((store) => {
        store.update((state) => ({
          ...state,
          profile: { ...state.profile, children: 1 },
          tranches: state.tranches.map((tranche) =>
            tranche.programmeKey === '300' ? { ...tranche, amount: euros(270_000) } : tranche,
          ),
        }))
      }),
    )

    expect(screen.getByText(/Reduced to 170\.000/)).toBeInTheDocument()
    // And the slider reads the drawable figure, not the one in the state.
    const amount = screen.getAllByRole('group', { name: 'Amount' })
    expect(amount[0]?.querySelector('[role="slider"]')).toHaveAttribute('aria-valuenow', '170000')
  })

  it('says nothing when the loan is within the ceiling', () => {
    loans()
    expect(screen.queryByText(/Reduced to/)).not.toBeInTheDocument()
  })

  it('gives every slider an accessible name', () => {
    loans()
    for (const name of ['Amount', 'Interest rate', 'Years', 'Interest only']) {
      expect(screen.getAllByRole('group', { name }).length).toBeGreaterThan(0)
    }
  })
})

describe('year by year', () => {
  function chart(): SessionStore {
    return section((c) => <YearByYear portfolio={c.portfolio} />)
  }

  /* Two series distinguished by colour need a legend by name, or the only way to tell
   * repayment from interest is to already know which is which. */
  it('names both series in the legend', () => {
    chart()
    expect(screen.getAllByText('Repayment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Interest').length).toBeGreaterThan(0)
  })

  /* The chart is coloured divs; this is the path a screen reader takes through it. */
  it('gives every bar a readable label', () => {
    chart()
    const bars = screen.getAllByRole('button', { name: /^Year \d+:/ })
    expect(bars.length).toBeGreaterThan(20)
    expect(bars[0]).toHaveAccessibleName(/interest plus .* repayment/)
  })

  it('marks where the fixed rate ends', () => {
    chart()
    expect(screen.getByText('Fixed rate ends')).toBeInTheDocument()
  })

  /* The palette checker flags the light-mode neutral at 2.73:1, which obliges a table
   * view. It is not decoration and not optional. */
  it('publishes the figures as a table', async () => {
    const user = userEvent.setup({ delay: null })
    chart()

    await user.click(screen.getByRole('button', { name: 'Show the figures' }))

    expect(screen.getByRole('table', { name: 'Every year as a table' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide the figures' })).toBeInTheDocument()
  })
})

describe('the ledger', () => {
  it('totals every loan', () => {
    section((c) => <WhatEachLoanCosts portfolio={c.portfolio} programmes={c.state.programmes} />)
    expect(screen.getByText('Everything together')).toBeInTheDocument()
  })
})

describe('the questions', () => {
  it('answers all ten', () => {
    mount(<Questions />)
    expect(
      screen.getByRole('button', { name: /Why can I not borrow the fees/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Where do these numbers come from/ }),
    ).toBeInTheDocument()
  })
})
