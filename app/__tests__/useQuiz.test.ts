import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuiz } from '../hooks/useQuiz'

describe('useQuiz', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads quiz files on loadFiles() call', async () => {
    const mockFiles = [{ id: 'f1', name: 'les1.txt' }]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFiles),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.loadFiles()
    })

    expect(result.current.files).toEqual(mockFiles)
    expect(result.current.filesLoading).toBe(false)
    expect(result.current.filesError).toBeNull()
  })

  it('sets filesError when the file list request fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Login om quiz te gebruiken.' }),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.loadFiles()
    })

    expect(result.current.filesError).toBe('Login om quiz te gebruiken.')
    expect(result.current.files).toEqual([])
  })

  it('loads pairs on selectFile() and tracks score while answering', async () => {
    const mockPairs = [
      { dutch: 'Hallo', english: 'Hello' },
      { dutch: 'Dag', english: 'Bye' },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPairs),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.selectFile({ id: 'f1', name: 'les1.txt' })
    })

    expect(result.current.pairs).toEqual(mockPairs)
    expect(result.current.currentIndex).toBe(0)

    act(() => { result.current.reveal() })
    expect(result.current.revealed).toBe(true)

    act(() => { result.current.markAndNext(true) })
    expect(result.current.score).toEqual({ correct: 1, incorrect: 0 })
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.revealed).toBe(false)

    act(() => { result.current.reveal() })
    act(() => { result.current.markAndNext(false) })
    expect(result.current.score).toEqual({ correct: 1, incorrect: 1 })
    expect(result.current.currentIndex).toBe(2)
  })

  it('resets to the file list on backToFiles()', async () => {
    const mockPairs = [{ dutch: 'Hallo', english: 'Hello' }]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPairs),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.selectFile({ id: 'f1', name: 'les1.txt' })
    })

    act(() => { result.current.backToFiles() })

    expect(result.current.selectedFile).toBeNull()
    expect(result.current.pairs).toEqual([])
  })
})
