import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TaaleilandenTab } from '../components/TaaleilandenTab'

const island = { id: 'i1', english: 'See you later', options: ['Tot straks.'], createdAt: '2026-01-01T00:00:00.000Z' }

function renderTab() {
  const props = {
    islands: [island],
    loading: false,
    saving: false,
    error: null,
    loadIslands: vi.fn(),
    addIslandAsync: vi.fn(),
    askChatGpt: vi.fn(),
    setEnglishAsync: vi.fn().mockResolvedValue([]),
    setOptionsAsync: vi.fn().mockResolvedValue([]),
    addOptionAsync: vi.fn(),
    deleteOptionAsync: vi.fn(),
    deleteIslandAsync: vi.fn(),
  }
  render(<TaaleilandenTab {...props} isLoggedIn />)
  return props
}

function englishSection() {
  return screen.getByText('Engelse frase').parentElement as HTMLElement
}

describe('TaaleilandenTab', () => {
  it('saves an edited English phrase on Enter', async () => {
    const props = renderTab()

    fireEvent.click(within(englishSection()).getByText('Bewerken'))
    const field = within(englishSection()).getByRole('textbox')
    fireEvent.change(field, { target: { value: '  See you soon ' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(props.setEnglishAsync).toHaveBeenCalledWith('i1', 'See you soon')
    expect(props.setOptionsAsync).not.toHaveBeenCalled()
  })

  it('does not save when the phrase did not change or Escape is pressed', () => {
    const props = renderTab()

    fireEvent.click(within(englishSection()).getByText('Bewerken'))
    fireEvent.keyDown(within(englishSection()).getByRole('textbox'), { key: 'Enter' })
    fireEvent.click(within(englishSection()).getByText('Bewerken'))
    const field = within(englishSection()).getByRole('textbox')
    fireEvent.change(field, { target: { value: 'Something else' } })
    fireEvent.keyDown(field, { key: 'Escape' })

    expect(props.setEnglishAsync).not.toHaveBeenCalled()
    expect(within(englishSection()).queryByRole('textbox')).toBeNull()
  })

  it('has no delete button on the English phrase, only on options', () => {
    renderTab()

    expect(within(englishSection()).queryByTitle('Optie verwijderen')).toBeNull()
    expect(screen.getAllByTitle('Optie verwijderen')).toHaveLength(1)
  })
})
