import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useEffect, type ComponentProps } from 'react'
import { ClozeTab } from '../components/ClozeTab'
import { useCloze } from '../hooks/useCloze'
import type { WordEntry } from '../types'

vi.mock('../components/PhraseDetailModal', () => ({ PhraseDetailModal: () => null }))
vi.mock('../hooks/usePictures', () => ({ usePictures: () => ({ pictures: [], loading: false }) }))

const words: WordEntry[] = [
  { id: '1', word: 'wurgcontract', meanings: [{ translation: 'exploitative contract', examples: [] }], updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: '2', word: 'staven', meanings: [{ translation: 'to substantiate', examples: [] }], updatedAt: '2024-01-01T00:00:00.000Z' },
]

function Harness() {
  const cloze = useCloze()
  useEffect(() => { cloze.start(words, 'kaarten') }, [])
  const props = {
    ...cloze,
    words,
    wordsLoading: false,
    wordsError: null,
    startEdit: () => {},
    setBeheersing: () => {},
    beheersingLoadingId: null,
    isLoggedIn: false,
    tracker: {},
  } as unknown as ComponentProps<typeof ClozeTab>
  return <ClozeTab {...props} />
}

describe('ClozeTab', () => {
  it('shows only the next card after marking a flipped card', () => {
    render(<Harness />)
    const cardTitle = 'Klik of druk op Spatie om om te draaien'

    act(() => { fireEvent.click(screen.getByTitle(cardTitle)) })
    act(() => { fireEvent.click(screen.getByText('✓ Goed (2)')) })

    expect(screen.getAllByTitle(cardTitle)).toHaveLength(1)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })
})
