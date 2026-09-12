// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { euros, type Money } from '@/domain/money'

import { MoneyInput } from './money-input'

function renderInput(value = euros(600_000)) {
  const onCommit = vi.fn<(value: Money) => void>()
  render(<MoneyInput value={value} onCommit={onCommit} label="Purchase price" />)
  return { onCommit, field: screen.getByLabelText('Purchase price') }
}

describe('MoneyInput', () => {
  it('shows a grouped figure at rest', () => {
    const { field } = renderInput()
    expect(field).toHaveValue('600.000')
  })

  /* The whole point of the draft: reformatting mid-word fights the typist and moves
   * the caret. While the field is being typed into it shows exactly what was typed. */
  it('shows what was typed while it is being typed', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, '750000')

    expect(field).toHaveValue('750000')
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('commits and reformats on blur', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, '750000')
    await user.tab()

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit.mock.calls[0]?.[0]?.equals(euros(750_000))).toBe(true)
  })

  it('commits on Enter', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, '425000{Enter}')

    expect(onCommit.mock.calls[0]?.[0]?.equals(euros(425_000))).toBe(true)
  })

  it('reads a German figure with grouping and a decimal comma', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, '1.250,50{Enter}')

    expect(onCommit.mock.calls[0]?.[0]?.equals(euros('1250.5'))).toBe(true)
  })

  /* The rule from STANDARDS.md §4: an unreadable field leaves the figures where they
   * are. Committing zero here would wipe someone's purchase price because they
   * tabbed away mid-edit. */
  it('commits nothing and snaps back when the draft is unreadable', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, 'abc')
    await user.tab()

    expect(onCommit).not.toHaveBeenCalled()
    expect(field).toHaveValue('600.000')
  })

  it('commits nothing when the field is left empty', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.tab()

    expect(onCommit).not.toHaveBeenCalled()
    expect(field).toHaveValue('600.000')
  })

  it('abandons the draft on Escape', async () => {
    const user = userEvent.setup()
    const { field, onCommit } = renderInput()

    await user.clear(field)
    await user.type(field, '999{Escape}')

    expect(onCommit).not.toHaveBeenCalled()
    expect(field).toHaveValue('600.000')
  })

  it('follows the value when it changes from outside while not being edited', () => {
    const onCommit = vi.fn<(value: Money) => void>()
    const { rerender } = render(
      <MoneyInput value={euros(600_000)} onCommit={onCommit} label="Purchase price" />,
    )
    rerender(<MoneyInput value={euros(800_000)} onCommit={onCommit} label="Purchase price" />)

    expect(screen.getByLabelText('Purchase price')).toHaveValue('800.000')
  })
})
