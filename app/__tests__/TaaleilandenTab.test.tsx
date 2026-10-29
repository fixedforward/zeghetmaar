import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TaaleilandenTab } from '../components/TaaleilandenTab'

const island = { id: 'i1', english: 'See you later', options: ['Tot straks.'], createdAt: '2026-01-01T00:00:00.000Z' }

function renderTab(islands = [island]) {
  const props = {
    islands,
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

function shownPhrases(): string[] {
  return [...document.querySelectorAll('summary > span:first-child')].map(el => el.textContent ?? '')
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

  it('searches on the English phrase and the Dutch options', () => {
    renderTab([island, { ...island, id: 'i2', english: "I'm getting bored with it", options: ['Ik raak het beu.'] }])
    const search = screen.getByPlaceholderText('Zoeken op Engelse frase of Nederlandse optie...')

    fireEvent.change(search, { target: { value: 'beu' } })
    expect(shownPhrases()).toEqual(["I'm getting bored with it"])

    fireEvent.change(search, { target: { value: 'later' } })
    expect(shownPhrases()).toEqual(['See you later'])

    fireEvent.change(search, { target: { value: 'nothing' } })
    expect(shownPhrases()).toEqual([])
    expect(screen.getByText('Geen taaleilanden gevonden voor "nothing".')).toBeTruthy()
  })

  it('shows 10 islands per page and goes back to page 1 on a new search', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...island, id: `i${i}`, english: `Phrase ${i + 1}` }))
    renderTab(many)

    expect(shownPhrases()).toHaveLength(10)
    expect(shownPhrases()[9]).toBe('Phrase 10')

    fireEvent.click(screen.getByRole('button', { name: '2' }))
    expect(shownPhrases()).toEqual(['Phrase 11', 'Phrase 12'])

    fireEvent.change(screen.getByPlaceholderText('Zoeken op Engelse frase of Nederlandse optie...'), { target: { value: 'Phrase' } })
    expect(shownPhrases()[0]).toBe('Phrase 1')
  })

  it('shows no page bar for 10 islands or fewer', () => {
    renderTab()

    expect(screen.queryByRole('button', { name: '›' })).toBeNull()
  })

  it('Oefenen shows a card: Space shows the options, 2 marks it Goed', () => {
    renderTab()

    fireEvent.click(screen.getByText('Oefenen (1 willekeurige)'))
    expect(screen.getByText('See you later')).toBeTruthy()
    expect(screen.queryByText('Tot straks.')).toBeNull()
    expect(screen.getByText('10 s')).toBeTruthy()

    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText('Tot straks.')).toBeTruthy()

    fireEvent.keyDown(window, { key: '2' })
    expect(screen.getByText('1 van 1 meteen goed')).toBeTruthy()

    fireEvent.click(screen.getByText('Terug naar de lijst'))
    expect(screen.getByPlaceholderText('Zoeken op Engelse frase of Nederlandse optie...')).toBeTruthy()
  })

  it('has no Oefenen button when no island has options', () => {
    renderTab([{ ...island, options: [] }])

    expect(screen.queryByText(/^Oefenen/)).toBeNull()
  })
})
