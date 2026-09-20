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
      json: () => Promise.resolve({ files: mockFiles }),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.loadFiles()
    })

    expect(result.current.files).toEqual(mockFiles)
    expect(result.current.filesLoading).toBe(false)
    expect(result.current.filesError).toBeNull()
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.hasPrevPage).toBe(false)
  })

  it('paginates through file pages with nextFilesPage() and prevFilesPage()', async () => {
    const page1 = { files: [{ id: 'f1', name: 'les2.txt' }], nextPageToken: 'tok2' }
    const page2 = { files: [{ id: 'f2', name: 'les1.txt' }] }
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => { result.current.loadFiles() })
    expect(result.current.files).toEqual(page1.files)
    expect(result.current.hasNextPage).toBe(true)
    expect(result.current.hasPrevPage).toBe(false)

    await act(async () => { result.current.nextFilesPage() })
    expect(fetch).toHaveBeenLastCalledWith('/api/quiz/files?pageToken=tok2')
    expect(result.current.files).toEqual(page2.files)
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.hasPrevPage).toBe(true)

    await act(async () => { result.current.prevFilesPage() })
    expect(fetch).toHaveBeenLastCalledWith('/api/quiz/files')
    expect(result.current.files).toEqual(page1.files)
    expect(result.current.hasPrevPage).toBe(false)
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

    // pairs are shuffled on load, so compare as a set rather than an exact order.
    expect(result.current.pairs).toHaveLength(mockPairs.length)
    expect(result.current.pairs).toEqual(expect.arrayContaining(mockPairs))
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
    // A wrong answer requeues the same exercise instead of just marking it —
    // the list grows by one and the new slot is a copy of the missed pair.
    expect(result.current.answers).toEqual([true, false, null])
    expect(result.current.pairs).toHaveLength(3)
    expect(result.current.pairs[2]).toEqual(result.current.pairs[1])
  })

  it('resets answers on restart()', async () => {
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

    act(() => { result.current.markAndNext(true) })
    expect(result.current.answers).toEqual([true, null])

    act(() => { result.current.restart() })
    expect(result.current.answers).toEqual([null, null])
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.score).toEqual({ correct: 0, incorrect: 0 })
  })

  it('markAndNext(false) requeues the exercise 2-5 questions later instead of a new round', async () => {
    const mockPairs = Array.from({ length: 10 }, (_, i) => ({ dutch: `Woord${i}`, english: `Word${i}` }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPairs),
    } as Response)

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // gap = 2 + floor(0 * 4) = 2

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.selectFile({ id: 'f1', name: 'les1.txt' })
    })

    const missedPair = result.current.pairs[0]

    act(() => { result.current.markAndNext(false) })

    expect(result.current.currentIndex).toBe(1)
    expect(result.current.pairs).toHaveLength(11)
    // answeredIndex(0) + 1 + gap(2) = 3
    expect(result.current.pairs[3]).toEqual(missedPair)
    expect(result.current.answers[0]).toBe(false)
    expect(result.current.answers[3]).toBeNull()
    expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })

    randomSpy.mockRestore()
  })

  it('clamps the requeue position to the end of the list when few exercises remain', async () => {
    const mockPairs = [
      { dutch: 'Hallo', english: 'Hello' },
      { dutch: 'Dag', english: 'Bye' },
      { dutch: 'Tot ziens', english: 'See you' },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPairs),
    } as Response)

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // gap = 2

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.selectFile({ id: 'f1', name: 'les1.txt' })
    })

    const missedPair = result.current.pairs[2]
    act(() => { result.current.jumpTo(2) })
    act(() => { result.current.markAndNext(false) })

    // Ideal position (2 + 1 + 2 = 5) is clamped to the end of the 3-item list.
    expect(result.current.pairs).toHaveLength(4)
    expect(result.current.pairs[3]).toEqual(missedPair)
    expect(result.current.answers).toEqual([null, null, false, null])

    randomSpy.mockRestore()
  })

  it('jumpTo() moves to a specific question without changing answers', async () => {
    const mockPairs = [
      { dutch: 'Hallo', english: 'Hello' },
      { dutch: 'Dag', english: 'Bye' },
      { dutch: 'Tot ziens', english: 'See you' },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPairs),
    } as Response)

    const { result } = renderHook(() => useQuiz())

    await act(async () => {
      result.current.selectFile({ id: 'f1', name: 'les1.txt' })
    })

    act(() => { result.current.markAndNext(true) })
    expect(result.current.currentIndex).toBe(1)

    act(() => { result.current.reveal() })
    act(() => { result.current.jumpTo(0) })
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.revealed).toBe(false)
    expect(result.current.answers).toEqual([true, null, null])

    // Re-answering an already-answered question updates its result instead of
    // double-counting the score, and — since it's now wrong — requeues it.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0) // gap = 2, clamped to list end
    act(() => { result.current.markAndNext(false) })
    expect(result.current.answers).toEqual([false, null, null, null])
    expect(result.current.pairs).toHaveLength(4)
    expect(result.current.score).toEqual({ correct: 0, incorrect: 1 })
    randomSpy.mockRestore()
  })

  it('toggles a file as completed via PATCH, and rolls back on failure', async () => {
    const mockFiles = [{ id: 'f1', name: 'les1.txt', completed: false }]
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ files: mockFiles }) } as Response)
      .mockResolvedValueOnce({ ok: true } as Response) // PATCH to true succeeds
      .mockResolvedValueOnce({ ok: false } as Response) // PATCH to false fails

    const { result } = renderHook(() => useQuiz())

    await act(async () => { result.current.loadFiles() })
    expect(result.current.files[0].completed).toBe(false)

    act(() => { result.current.toggleFileCompleted(result.current.files[0]) })
    expect(result.current.files[0].completed).toBe(true)
    expect(fetch).toHaveBeenLastCalledWith('/api/quiz/files/f1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ completed: true }),
    }))
    await Promise.resolve()

    act(() => { result.current.toggleFileCompleted(result.current.files[0]) })
    expect(result.current.files[0].completed).toBe(false)
    await act(async () => { await Promise.resolve() })
    // the failed PATCH rolls the optimistic update back
    expect(result.current.files[0].completed).toBe(true)
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
