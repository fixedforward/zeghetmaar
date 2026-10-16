import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMistakes } from '../hooks/useMistakes'
import { buildChatGptMistakeFixUrl } from '../lib/chatgpt'
import type { Mistake } from '../types'

const make = (row: number, timesPracticed = 0): Mistake =>
  ({ row, mistake: `fout ${row}`, correction: `goed ${row}`, type: 'Grammar fix', timesPracticed })

function mockFetch(mistakes: Mistake[], putOk = true) {
  global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === 'PUT'
      ? { ok: putOk, json: () => Promise.resolve(putOk ? { ok: true } : { error: 'Kon de teller niet opslaan.' }) }
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
    expect(result.current.error).toBe('Kon de teller niet opslaan.')
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

  it('shows the error when loading fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Foutenbestand is niet geconfigureerd.' }),
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useMistakes())
    await act(async () => { await result.current.loadMistakesAsync() })

    expect(result.current.error).toBe('Foutenbestand is niet geconfigureerd.')
  })
})
