import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWords } from '../hooks/useWords'

describe('useWords', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads words on loadWords() call', async () => {
    const mockWords = [{ id: '1', word: 'gezellig', translation: 'cozy', examples: [] }]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWords),
    } as Response)

    const { result } = renderHook(() => useWords('gpt-4o-mini'))

    await act(async () => {
      result.current.loadWords()
    })

    expect(result.current.words).toEqual(mockWords)
    expect(result.current.wordsLoading).toBe(false)
    expect(result.current.wordsError).toBeNull()
  })

  it('sets wordsError when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as Response)

    const { result } = renderHook(() => useWords('gpt-4o-mini'))

    await act(async () => {
      result.current.loadWords()
    })

    expect(result.current.wordsError).toBe('Kon de fraselijst niet laden')
    expect(result.current.words).toEqual([])
  })
})
