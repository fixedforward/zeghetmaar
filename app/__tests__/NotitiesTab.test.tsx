import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { NotitiesTab } from '../components/NotitiesTab'

const notes = [
  { id: 'n1', title: 'Grammatica', text: 'Om te + infinitief', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'n2', title: '', text: 'Gezellig\nmet vrienden', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
]

function renderTab(isLoggedIn = true) {
  const props = {
    notes,
    loading: false,
    saving: false,
    error: null,
    loadNotes: vi.fn(),
    addNoteAsync: vi.fn().mockResolvedValue(true),
    setTitleAsync: vi.fn().mockResolvedValue(true),
    setTextAsync: vi.fn().mockResolvedValue(true),
    deleteNoteAsync: vi.fn().mockResolvedValue(true),
  }
  render(<NotitiesTab {...props} isLoggedIn={isLoggedIn} />)
  return props
}

const headings = () => [...document.querySelectorAll('summary > span:first-child')].map(el => el.textContent)

describe('NotitiesTab', () => {
  it('asks to log in and loads nothing when logged out', () => {
    const props = renderTab(false)

    expect(screen.getByText('Log in om je notities te zien.')).toBeTruthy()
    expect(props.loadNotes).not.toHaveBeenCalled()
  })

  it('shows each note by its title, or its first line when it has none', () => {
    const props = renderTab()

    expect(props.loadNotes).toHaveBeenCalled()
    expect(headings()).toEqual(['Grammatica', 'Gezellig'])
  })

  it('saves a new note with ⌘+Enter and clears the form', async () => {
    const props = renderTab()

    fireEvent.change(screen.getByPlaceholderText('Titel (optioneel)'), { target: { value: ' Woorden ' } })
    const field = screen.getByPlaceholderText(/Schrijf een notitie/)
    fireEvent.change(field, { target: { value: 'liggen\nleggen ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(props.addNoteAsync).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: 'Enter', metaKey: true })

    expect(props.addNoteAsync).toHaveBeenCalledWith('Woorden', 'liggen\nleggen')
    await waitFor(() => expect((field as HTMLTextAreaElement).value).toBe(''))
  })

  it('filters the notes on title and text', () => {
    renderTab()

    fireEvent.change(screen.getByPlaceholderText('Zoeken in titel of tekst...'), { target: { value: 'vrienden' } })

    expect(headings()).toEqual(['Gezellig'])
  })

  it('edits the text in a text area that keeps Enter for new lines', () => {
    const props = renderTab()

    const card = screen.getByText('Grammatica', { selector: 'summary > span' }).closest('details') as HTMLElement
    const textSection = within(card).getByText('Notitie').parentElement as HTMLElement
    fireEvent.click(within(textSection).getByText('Bewerken'))
    const field = within(textSection).getByRole('textbox')
    expect(field.tagName).toBe('TEXTAREA')
    fireEvent.change(field, { target: { value: 'Om te + infinitief\nbijv. om te leren' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(props.setTextAsync).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true })

    expect(props.setTextAsync).toHaveBeenCalledWith('n1', 'Om te + infinitief\nbijv. om te leren')
  })

  it('deletes a note after confirming', () => {
    const props = renderTab()

    const card = screen.getByText('Grammatica', { selector: 'summary > span' }).closest('details') as HTMLElement
    fireEvent.click(within(card).getByText('✕ Verwijderen'))
    fireEvent.click(within(card).getByText('Ja'))

    expect(props.deleteNoteAsync).toHaveBeenCalledWith('n1')
  })
})
