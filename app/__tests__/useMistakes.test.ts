import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMistakes } from '../hooks/useMistakes'
import { buildChatGptMistakeFixUrl } from '../lib/chatgpt'
import type { Mistake } from '../types'

const make = (row: number, timesPracticed = 0): Mistake =>
  ({ row, mistake: `fout ${row}`, correction: `goed ${row}`, type: 'Grammar fix', timesPracticed, translation: `english ${row}` })

function mockFetch(mistakes: Mistake[], writeOk = true) {
  global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'PUT' || init?.method === 'DELETE'
      ? { ok: writeOk, json: () => Promise.resolve(writeOk ? { ok: true } : { error: 'Opslaan mislukt.' }) }
      : { ok: true, json: () => Promise.resolve({ mistakes }) }) as unknown as typeof fetch
}

async function renderLoaded(mistakes: Mistake[], onPractice?: () => void) {
  const hook = renderHook(() => useMistakes(onPractice))
  await act(async () => { await hook.result.current.loadMistakesAsync() })
  return hook
}

describe('useMistakes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with the least practiced mistake', async () => {
    mockFetch([make(1, 2), make(2, 0)])

    const { result } = await renderLoaded([make(1, 2), make(2, 0)])

    expect(result.current.queue).toEqual([2, 1])
    expect(result.current.current?.row).toBe(2)
  })

  it('marking Goed saves count + 1 to Drive and counts as practice; clicking again undoes it', async () => {
    mockFetch([make(1, 2)])
    const onPractice = vi.fn()
    const { result } = await renderLoaded([make(1, 2)], onPractice)

    act(() => result.current.reveal())
    await act(async () => { await result.current.toggleCorrectAsync() })

    expect(result.current.current?.timesPracticed).toBe(3)
    expect(result.current.markedCorrect).toBe(true)
    expect(onPractice).toHaveBeenCalledTimes(1)
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body))
      .toEqual({ row: 1, mistake: 'fout 1', timesPracticed: 3 })

    await act(async () => { await result.current.toggleCorrectAsync() })

    expect(result.current.current?.timesPracticed).toBe(2)
    expect(result.current.markedCorrect).toBe(false)
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[2][1].body).timesPracticed).toBe(2)
  })

  it('rolls the count back when saving fails', async () => {
    mockFetch([make(1, 2)], false)
    const { result } = await renderLoaded([make(1, 2)])

    act(() => result.current.reveal())
    await act(async () => { await result.current.toggleCorrectAsync() })

    expect(result.current.current?.timesPracticed).toBe(2)
    expect(result.current.markedCorrect).toBe(false)
    expect(result.current.error).toBe('Opslaan mislukt.')
  })

  it('can only mark Goed after revealing the answer', async () => {
    mockFetch([make(1)])
    const { result } = await renderLoaded([make(1)])

    await act(async () => { await result.current.toggleCorrectAsync() })

    expect(result.current.current?.timesPracticed).toBe(0)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('requeues a mistake that was not marked Goed, and not one that was', async () => {
    const list = [make(1), make(2, 1), make(3, 2)]
    mockFetch(list)
    const { result } = await renderLoaded(list)

    act(() => result.current.reveal())
    act(() => result.current.next())

    expect(result.current.queue).toEqual([1, 2, 3, 1])
    expect(result.current.currentIndex).toBe(1)
    expect(result.current.revealed).toBe(false)

    act(() => result.current.reveal())
    await act(async () => { await result.current.toggleCorrectAsync() })
    act(() => result.current.next())

    expect(result.current.queue).toEqual([1, 2, 3, 1])
    expect(result.current.markedCorrect).toBe(false)
  })

  it('is done after the last card', async () => {
    mockFetch([make(1)])
    const { result } = await renderLoaded([make(1)])

    act(() => result.current.reveal())
    await act(async () => { await result.current.toggleCorrectAsync() })
    act(() => result.current.next())

    expect(result.current.done).toBe(true)
  })

  it('opens ChatGPT with the mistake, my attempt and the correction', async () => {
    mockFetch([make(1)])
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const { result } = await renderLoaded([make(1)])

    act(() => result.current.setUserInput('  mijn poging  '))
    act(() => result.current.askChatGpt())

    expect(openSpy.mock.calls[0][0]).toBe(buildChatGptMistakeFixUrl(make(1), 'mijn poging'))
  })

  it('deleting the current card removes it, shifts the rows below it and shows the next card', async () => {
    const list = [make(1), make(2, 1), make(3, 2)]
    mockFetch(list)
    const { result } = await renderLoaded(list)
    act(() => result.current.setUserInput('iets'))

    await act(async () => { await result.current.deleteMistakeAsync(1) })

    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body)).toEqual({ row: 1, mistake: 'fout 1' })
    expect(result.current.mistakes.map(m => [m.row, m.mistake])).toEqual([[1, 'fout 2'], [2, 'fout 3']])
    expect(result.current.queue).toEqual([1, 2])
    expect(result.current.current?.mistake).toBe('fout 2')
    expect(result.current.userInput).toBe('')
  })

  it('deleting an earlier card keeps the current card in place', async () => {
    const list = [make(1), make(2, 1), make(3, 2)]
    mockFetch(list)
    const { result } = await renderLoaded(list)
    act(() => result.current.reveal())
    await act(async () => { await result.current.toggleCorrectAsync() })
    act(() => result.current.next())

    await act(async () => { await result.current.deleteMistakeAsync(1) })

    expect(result.current.currentIndex).toBe(0)
    expect(result.current.current?.mistake).toBe('fout 2')
  })

  it('keeps the mistake when deleting fails', async () => {
    mockFetch([make(1)], false)
    const { result } = await renderLoaded([make(1)])

    await act(async () => { await result.current.deleteMistakeAsync(1) })

    expect(result.current.mistakes).toHaveLength(1)
    expect(result.current.error).toBe('Opslaan mislukt.')
  })

  it('saves an edited correction to Drive and shows it', async () => {
    mockFetch([make(1)])
    const { result } = await renderLoaded([make(1)])
    act(() => result.current.reveal())

    let saved = false
    await act(async () => { saved = await result.current.saveCorrectionAsync('  Nieuwe\nvertaling. ') })

    expect(saved).toBe(true)
    expect(JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body))
      .toEqual({ row: 1, mistake: 'fout 1', correction: 'Nieuwe vertaling.' })
    expect(result.current.current?.correction).toBe('Nieuwe vertaling.')
  })

  it('does not save an unchanged or empty correction, and keeps the old one when saving fails', async () => {
    mockFetch([make(1)], false)
    const { result } = await renderLoaded([make(1)])

    await act(async () => { await result.current.saveCorrectionAsync('goed 1') })
    await act(async () => { await result.current.saveCorrectionAsync('   ') })
    expect(global.fetch).toHaveBeenCalledTimes(1)

    await act(async () => { await result.current.saveCorrectionAsync('anders') })
    expect(result.current.current?.correction).toBe('goed 1')
    expect(result.current.error).toBe('Opslaan mislukt.')
  })

  it('practices only the sentences with the chosen number of Goed, and starts over', async () => {
    const list = [make(1, 0), make(2, 1), make(3, 3), make(4, 5)]
    mockFetch(list)
    const { result } = await renderLoaded(list)
    act(() => result.current.reveal())
    act(() => result.current.next())

    act(() => result.current.setPracticedFilter('3+'))

    expect(result.current.practicedFilter).toBe('3+')
    expect([...result.current.queue].sort()).toEqual([3, 4])
    expect(result.current.currentIndex).toBe(0)

    act(() => result.current.setPracticedFilter('2'))
    expect(result.current.queue).toEqual([])
  })

  it('keeps the filter when starting over', async () => {
    const list = [make(1, 0), make(2, 1)]
    mockFetch(list)
    const { result } = await renderLoaded(list)
    act(() => result.current.setPracticedFilter('1'))

    act(() => result.current.restart())

    expect(result.current.queue).toEqual([2])
  })

  it('shows the error when loading fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Foutenbestand is niet geconfigureerd.' }),
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useMistakes())
    await act(async () => { await result.current.loadMistakesAsync() })

    expect(result.current.error).toBe('Foutenbestand is niet geconfigureerd.')
  })
})
