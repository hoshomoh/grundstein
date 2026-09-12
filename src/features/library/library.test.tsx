// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { euros } from '@/domain/money'
import { PROGRAMMES } from '@/domain/programmes'
import { initialiseI18n } from '@/i18n'
import type { SessionStorage } from '@/state/persistence'
import { SessionProvider } from '@/state/session-context'
import { createSessionStore, type SessionStore } from '@/state/session-store'
import { useSession } from '@/state/use-session'
import { useSessionStore } from '@/state/session-context'
import {
  addProgramme,
  removeProgramme,
  restoreProgrammes,
  toggleProgrammeValue,
  withProgramme,
} from '@/state/session-state'
import type { Programme } from '@/domain/types'

import { ProgrammeEditor } from './programme-editor'

function memoryStorage(): SessionStorage {
  const contents = new Map<string, string>()
  return {
    read: (key) => contents.get(key) ?? null,
    write: (key, value) => void contents.set(key, value),
  }
}

/** The editor for one programme, driven by a real store. */
function Editing({ programmeKey }: { programmeKey: string }): ReactElement {
  const store = useSessionStore()
  const state = useSession(store)
  const programme = state.programmes[programmeKey]
  if (!programme) return <p>gone</p>

  return (
    <ProgrammeEditor
      programme={programme}
      others={Object.values(state.programmes).filter((other) => other.key !== programmeKey)}
      language="en"
      onChange={(patch: Partial<Programme>) => {
        store.update((current) => withProgramme(current, programmeKey, patch))
      }}
      onToggleProjectType={(value) => {
        store.update((current) =>
          toggleProgrammeValue(current, programmeKey, 'projectTypes', value),
        )
      }}
      onToggleExclusion={(value) => {
        store.update((current) => toggleProgrammeValue(current, programmeKey, 'excludes', value))
      }}
      onDelete={() => {
        store.update((current) => removeProgramme(current, programmeKey))
      }}
    />
  )
}

function withStore(store: SessionStore, programmeKey = '300'): ReactElement {
  return (
    <SessionProvider store={store}>
      <Editing programmeKey={programmeKey} />
    </SessionProvider>
  )
}

beforeAll(() => {
  initialiseI18n('en')
})

describe('the programme editor', () => {
  it('shows the programmes current figures', () => {
    render(withStore(createSessionStore(memoryStorage())))

    expect(screen.getByLabelText('Name')).toHaveValue('KfW 300 – Wohneigentum für Familien')
    expect(screen.getByLabelText('Starting rate, %')).toHaveValue('1,12')
    expect(screen.getByLabelText('Income limit, € (leave blank for none)')).toHaveValue('90.000')
  })

  /* KfW 300's ceiling is a children × QNG grid. The editor is one box, so it shows the
   * best cell — the alternative is silently showing the lowest tier as though it were
   * the whole rule. */
  it('shows the highest ceiling a tiered programme offers', () => {
    render(withStore(createSessionStore(memoryStorage())))
    expect(screen.getByLabelText('Most you can borrow, €')).toHaveValue('270.000')
  })

  it('commits an edited rate to the store', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    const rate = screen.getByLabelText('Starting rate, %')
    await user.clear(rate)
    await user.type(rate, '2,5{Enter}')

    expect(store.getSnapshot().programmes['300']?.defaultRatePercent).toBe(2.5)
  })

  /* Typing a flat ceiling is the reader saying "this is the number" — the grid is
   * replaced rather than quietly kept underneath. */
  it('replaces a tier grid with a flat ceiling when one is typed', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    const cap = screen.getByLabelText('Most you can borrow, €')
    await user.clear(cap)
    await user.type(cap, '300000{Enter}')

    const ceiling = store.getSnapshot().programmes['300']?.ceiling
    expect(ceiling?.kind).toBe('flat')
    expect(ceiling?.kind === 'flat' && ceiling.amount.equals(euros(300_000))).toBe(true)
  })

  it('treats an empty income limit as no income test', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    const limit = screen.getByLabelText('Income limit, € (leave blank for none)')
    await user.clear(limit)
    await user.type(limit, '0{Enter}')

    expect(store.getSnapshot().programmes['300']?.incomeCap).toBeNull()
  })

  it('toggles a project type on and off', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    const renovating = screen.getByRole('button', { name: 'Renovating the home I own' })
    expect(renovating).toHaveAttribute('aria-pressed', 'false')

    await user.click(renovating)
    expect(store.getSnapshot().programmes['300']?.projectTypes).toContain('renovate')
  })

  it('toggles an exclusion', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    await user.click(screen.getByRole('button', { name: 'KfW 308' }))
    expect(store.getSnapshot().programmes['300']?.excludes).toContain('308')
  })

  it('says where the figures came from and when', () => {
    render(withStore(createSessionStore(memoryStorage())))
    expect(screen.getByText(/Checked against www\.kfw\.de on/)).toBeInTheDocument()
  })

  /* Deleting a programme takes every loan funded by it. Doing that on a single click
   * would be the app throwing away the reader's work without asking. */
  it('asks before deleting, and says what else goes', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    await user.click(screen.getByRole('button', { name: 'Delete this loan' }))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Delete this loan?')).toBeInTheDocument()
    expect(within(dialog).getByText('Any of your loans using it will go too.')).toBeInTheDocument()

    // Still there while the question is open.
    expect(store.getSnapshot().programmes['300']).toBeDefined()
  })

  it('keeps the programme when the reader cancels', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    await user.click(screen.getByRole('button', { name: 'Delete this loan' }))
    await user.click(screen.getByRole('button', { name: 'Keep what I have' }))

    expect(store.getSnapshot().programmes['300']).toBeDefined()
  })

  it('deletes the programme and its loans when the reader confirms', async () => {
    const user = userEvent.setup({ delay: null })
    const store = createSessionStore(memoryStorage())
    render(withStore(store))

    const dialogButton = screen.getByRole('button', { name: 'Delete this loan' })
    await user.click(dialogButton)
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete this loan' }))

    const after = store.getSnapshot()
    expect(after.programmes['300']).toBeUndefined()
    expect(after.tranches.some((tranche) => tranche.programmeKey === '300')).toBe(false)
  })
})

describe('the catalogue as a whole', () => {
  it('adds a programme of the readers own, marked as theirs', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => addProgramme(state, '2026-09-12'))

    const added = store.getSnapshot().programmes.custom1
    expect(added?.provenance.source).toBeNull()
    expect(store.getSnapshot().programmeOrder).toContain('custom1')
  })

  it('numbers each new programme past the last', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => addProgramme(addProgramme(state, '2026-09-12'), '2026-09-12'))

    expect(store.getSnapshot().programmes.custom2).toBeDefined()
  })

  /* Restoring is about the catalogue, not the reader's purchase. Their price, their
   * answers and any loan whose programme survives are all left alone. */
  it('restores the originals without touching the readers own figures', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => ({ ...state, price: euros(825_000) }))
    store.update((state) => removeProgramme(state, '300'))
    store.update(restoreProgrammes)

    const after = store.getSnapshot()
    expect(Object.keys(after.programmes).sort()).toEqual(Object.keys(PROGRAMMES).sort())
    expect(after.price.equals(euros(825_000))).toBe(true)
  })

  it('drops a loan funded by a programme the reader invented', () => {
    const store = createSessionStore(memoryStorage())
    store.update((state) => addProgramme(state, '2026-09-12'))
    store.update((state) => ({
      ...state,
      tranches: [
        ...state.tranches,
        {
          id: 99,
          programmeKey: 'custom1',
          name: 'Mine',
          amount: euros(10_000),
          ratePercent: 3,
          years: 20,
          graceYears: 0,
          followupPeriods: [],
        },
      ],
    }))
    store.update(restoreProgrammes)

    expect(store.getSnapshot().tranches.some((tranche) => tranche.id === 99)).toBe(false)
  })
})
