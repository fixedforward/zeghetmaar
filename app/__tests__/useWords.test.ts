import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWords } from '../hooks/useWords'

describe('useWords', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads words on loadWords() call', async () => {
    const mockWords = [{ id: '1', word: 'gezellig', meanings: [{ translation: 'cozy', examples: [] }] }]
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

  it('sends the selected tags when adding a word', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    const { result } = renderHook(() => useWords('gpt-4o-mini'))

    act(() => {
      result.current.setNewWord('gezellig')
      result.current.setNewMeanings([{ translation: 'cozy', examples: [] }])
      result.current.setNewTags(['werk', 'reizen'])
    })

    await act(async () => {
      result.current.handleAddWord()
    })

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({
      word: 'gezellig',
      meanings: [{ translation: 'cozy', examples: [] }],
      tags: ['werk', 'reizen'],
    })
  })

  it('prefills editTags from the entry and sends the selected tags when editing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    const { result } = renderHook(() => useWords('gpt-4o-mini'))
    const entry = { id: '1', word: 'gezellig', meanings: [{ translation: 'cozy', examples: [] }], tags: ['werk', 'reizen'], updatedAt: '2024-01-01T00:00:00.000Z' }

    act(() => {
      result.current.startEdit(entry)
    })
    expect(result.current.editTags).toEqual(['werk', 'reizen'])

    act(() => {
      result.current.setEditTags(['vakantie'])
    })

    await act(async () => {
      result.current.handleEditWord()
    })

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({ id: '1', tags: ['vakantie'] })
  })
})
