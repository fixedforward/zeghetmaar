import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAddPhraseModal } from '../hooks/useAddPhraseModal'
import type { useWords } from '../hooks/useWords'

function fakeWords() {
  return { loadWords: vi.fn(), startAddWord: vi.fn() } as unknown as ReturnType<typeof useWords>
}

describe('useAddPhraseModal', () => {
  it('opens prefilled with the text and loads the phrase list for its tags', () => {
    const words = fakeWords()
    const { result } = renderHook(() => useAddPhraseModal(words))

    act(() => result.current.openWith('er niet bij stilstaan'))

    expect(result.current.open).toBe(true)
    expect(words.startAddWord).toHaveBeenCalledWith('er niet bij stilstaan')
    expect(words.loadWords).toHaveBeenCalled()
  })

  it('closes', () => {
    const { result } = renderHook(() => useAddPhraseModal(fakeWords()))

    act(() => result.current.openWith('iets'))
    act(() => result.current.close())

    expect(result.current.open).toBe(false)
  })
})
