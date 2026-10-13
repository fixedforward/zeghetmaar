import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PhraseDetailModal } from '../components/PhraseDetailModal'
import type { useWords } from '../hooks/useWords'
import type { WordEntry } from '../types'

type Props = ReturnType<typeof useWords> & { isLoggedIn: boolean }

const entry: WordEntry = {
  id: '1',
  word: 'gezellig',
  meanings: [{ translation: 'cozy', examples: ['Het was een gezellige avond — It was a cozy evening'] }],
  tags: ['sfeer'],
  beheersing: 2,
  isFavorite: false,
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function buildProps(overrides: Partial<Props> = {}): Props {
  return {
    words: [entry],
    wordsLoading: false,
    wordsError: null,
    newWord: '',
    setNewWord: vi.fn(),
    newMeanings: [{ translation: '', examples: [] }],
    setNewMeanings: vi.fn(),
    newTags: [],
    setNewTags: vi.fn(),
    addLoading: false,
    addError: null,
    showAddForm: false,
    setShowAddForm: vi.fn(),
    deleteConfirmId: null,
    setDeleteConfirmId: vi.fn(),
    deleteLoading: false,
    editId: entry.id,
    editWord: entry.word,
    setEditWord: vi.fn(),
    editMeanings: entry.meanings.map(m => ({ ...m, examples: [...m.examples] })),
    setEditMeanings: vi.fn(),
    editTags: ['sfeer'],
    setEditTags: vi.fn(),
    editPicture: null,
    setEditPicture: vi.fn(),
    editLoading: false,
    aiExamplesLoading: false,
    aiTranslationLoading: false,
    loadWords: vi.fn(),
    startAddWord: vi.fn(),
    handleAddWord: vi.fn(),
    handleDeleteWord: vi.fn(),
    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
    handleEditWord: vi.fn(),
    generateAiExamples: vi.fn(),
    generateAiTranslation: vi.fn(),
    setBeheersing: vi.fn(),
    beheersingLoadingId: null,
    toggleFavorite: vi.fn(),
    favoriteLoadingId: null,
    isLoggedIn: true,
    ...overrides,
  }
}

const pictures = [
  { id: 'pic1', name: 'fiets.png' },
  { id: 'pic2', name: 'gezellig$cozy.jpg' },
  { id: 'pic3', name: 'gezellig$pleasant.png' },
]

describe('PhraseDetailModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(pictures) } as Response)
  })

  it('renders nothing when editId matches no entry', () => {
    const { container } = render(<PhraseDetailModal {...buildProps({ editId: null })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the editable fields for the matched entry', () => {
    render(<PhraseDetailModal {...buildProps()} />)
    expect(screen.getByDisplayValue('gezellig')).toBeInTheDocument()
    expect(screen.getByDisplayValue('cozy')).toBeInTheDocument()
    expect(screen.getByText('sfeer')).toBeInTheDocument()
  })

  it('calls setEditWord when typing in the Frase field', () => {
    const props = buildProps()
    render(<PhraseDetailModal {...props} />)
    fireEvent.change(screen.getByDisplayValue('gezellig'), { target: { value: 'gezelligheid' } })
    expect(props.setEditWord).toHaveBeenCalledWith('gezelligheid')
  })

  it('calls handleEditWord when Opslaan is clicked', () => {
    const props = buildProps()
    render(<PhraseDetailModal {...props} />)
    fireEvent.click(screen.getByText('Opslaan'))
    expect(props.handleEditWord).toHaveBeenCalled()
  })

  it('hides Opslaan and shows a login hint when logged out', () => {
    render(<PhraseDetailModal {...buildProps({ isLoggedIn: false })} />)
    expect(screen.queryByText('Opslaan')).not.toBeInTheDocument()
    expect(screen.getByText('Log in om wijzigingen op te slaan.')).toBeInTheDocument()
  })

  it('calls cancelEdit when Annuleren, the close button, or Escape is used', () => {
    const props = buildProps()
    render(<PhraseDetailModal {...props} />)

    fireEvent.click(screen.getByText('Annuleren'))
    expect(props.cancelEdit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Sluiten'))
    expect(props.cancelEdit).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(props.cancelEdit).toHaveBeenCalledTimes(3)
  })

  it('calls cancelEdit when clicking the overlay but not the dialog itself', () => {
    const props = buildProps()
    const { container } = render(<PhraseDetailModal {...props} />)

    fireEvent.click(screen.getByText('Frase bewerken'))
    expect(props.cancelEdit).not.toHaveBeenCalled()

    fireEvent.click(container.firstChild as Element)
    expect(props.cancelEdit).toHaveBeenCalledTimes(1)
  })

  it('asks for confirmation before deleting, then calls handleDeleteWord', () => {
    const props = buildProps()
    const { rerender } = render(<PhraseDetailModal {...props} />)

    fireEvent.click(screen.getByTitle('Verwijderen'))
    expect(props.setDeleteConfirmId).toHaveBeenCalledWith('1')

    rerender(<PhraseDetailModal {...props} deleteConfirmId="1" />)
    fireEvent.click(screen.getByText('Ja'))
    expect(props.handleDeleteWord).toHaveBeenCalledWith('1')
  })

  it('toggles favorite and sets beheersing for the entry', () => {
    const props = buildProps()
    render(<PhraseDetailModal {...props} />)

    fireEvent.click(screen.getByTitle('Voeg toe aan favorieten'))
    expect(props.toggleFavorite).toHaveBeenCalledWith('1', false)

    fireEvent.click(screen.getByTitle('Beheersing 3'))
    expect(props.setBeheersing).toHaveBeenCalledWith('1', 3)
  })

  it('automatically displays the picture named after the phrase and meaning', async () => {
    const props = buildProps()
    render(<PhraseDetailModal {...props} />)

    await waitFor(() => expect(screen.getByRole('img', { name: 'gezellig — cozy' })).toHaveAttribute('src', '/api/pictures/pic2'))
    expect(global.fetch).toHaveBeenCalledWith('/api/pictures')
    expect(props.setEditPicture).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox', { name: 'Afbeelding' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Gebruik /)).not.toBeInTheDocument()
  })

  it('shows no image when there is no matching file', async () => {
    const props = buildProps({ editWord: 'onbekend' })
    render(<PhraseDetailModal {...props} />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/pictures'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(props.setEditPicture).not.toHaveBeenCalled()
  })

  it('prefers a meaning-specific picture over the old phrase picture', async () => {
    const props = buildProps({ editPicture: 'pic1' })
    render(<PhraseDetailModal {...props} />)

    await waitFor(() => expect(screen.getByRole('img', { name: 'gezellig — cozy' })).toHaveAttribute('src', '/api/pictures/pic2'))
    expect(screen.queryByRole('combobox', { name: 'Afbeelding' })).not.toBeInTheDocument()
    expect(props.setEditPicture).not.toHaveBeenCalled()
  })

  it('shows a separate picture directly below each translation', async () => {
    render(<PhraseDetailModal {...buildProps({ editMeanings: [
      { translation: 'cozy', examples: [] },
      { translation: 'pleasant', examples: [] },
    ] })} />)
    for (const [meaning, id] of [['cozy', 'pic2'], ['pleasant', 'pic3']]) {
      const image = await screen.findByRole('img', { name: `gezellig — ${meaning}` })
      expect(image).toHaveAttribute('src', `/api/pictures/${id}`)
      const input = screen.getByDisplayValue(meaning)
      expect(input.parentElement?.nextElementSibling).toBe(image)
    }
  })

  it('shows the saved picture without a picker when logged out', () => {
    render(<PhraseDetailModal {...buildProps({ isLoggedIn: false, words: [{ ...entry, picture: 'pic1' }] })} />)

    expect(screen.getByRole('img', { name: 'gezellig — cozy' })).toHaveAttribute('src', '/api/pictures/pic1')
    expect(screen.queryByLabelText('Afbeelding')).not.toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
