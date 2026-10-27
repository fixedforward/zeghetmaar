import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLanguageIslands } from '../hooks/useLanguageIslands'
import { LANGUAGE_ISLAND_OPTIONS_PROMPT } from '../lib/prompts'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const fail = (error: string) => ({ ok: false, json: () => Promise.resolve({ error }) } as Response)

const island = { id: 'i1', english: 'See you later', options: ['Tot straks.'], createdAt: '2026-01-01T00:00:00.000Z' }

type FetchInit = { method?: string; body?: string }

function bodyOf(call: unknown[]) {
  return JSON.parse((call[1] as FetchInit).body ?? '{}')
}

describe('useLanguageIslands', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('loads the islands once, unless forced', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [island] }))
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    await act(async () => { result.current.loadIslands() })
    await act(async () => { result.current.loadIslands() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.islands).toEqual([island])

    await act(async () => { result.current.loadIslands(true) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('generateOptionsAsync asks the AI and saves its options after the existing ones', async () => {
    const saved = { ...island, options: ['Tot straks.', 'Tot zo.'] }
    global.fetch = vi.fn((url: string) => Promise.resolve(url === '/api/chat'
      ? ok({ response: '1. Tot zo.\n2. tot straks.' })
      : ok({ islands: [saved] }))) as typeof fetch
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    let done = false
    await act(async () => { done = await result.current.generateOptionsAsync(island) })

    expect(done).toBe(true)
    const calls = vi.mocked(fetch).mock.calls
    expect(calls[0][0]).toBe('/api/chat')
    expect(bodyOf(calls[0])).toEqual({ text: 'See you later', prompt: LANGUAGE_ISLAND_OPTIONS_PROMPT, model: 'model-a' })
    expect(calls[1][0]).toBe('/api/language-islands')
    expect(bodyOf(calls[1])).toEqual({ id: 'i1', options: ['Tot straks.', 'Tot zo.'] })
    expect(result.current.islands).toEqual([saved])
    expect(result.current.generatingId).toBeNull()
  })

  it('generateOptionsAsync shows the error and saves nothing when the AI fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ error: 'AI request niet gelukt.' }))
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    let done = true
    await act(async () => { done = await result.current.generateOptionsAsync(island) })

    expect(done).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('AI request niet gelukt.')
  })

  it('addIslandAsync posts the phrase and then generates options for the new island', async () => {
    const added = { ...island, options: [] }
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ok({ islands: [added] }))
      .mockResolvedValueOnce(ok({ response: 'Tot straks.' }))
      .mockResolvedValueOnce(ok({ islands: [island] })) as typeof fetch
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    let done = false
    await act(async () => { done = await result.current.addIslandAsync('See you later') })

    expect(done).toBe(true)
    const calls = vi.mocked(fetch).mock.calls
    expect((calls[0][1] as FetchInit).method).toBe('POST')
    expect(bodyOf(calls[0])).toEqual({ english: 'See you later' })
    expect(bodyOf(calls[2])).toEqual({ id: 'i1', options: ['Tot straks.'] })
    expect(result.current.islands).toEqual([island])
  })

  it('addIslandAsync shows the server error and does not call the AI on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(fail('Vul een Engelse frase in.'))
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    let done = true
    await act(async () => { done = await result.current.addIslandAsync('') })

    expect(done).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('Vul een Engelse frase in.')
  })

  it('addOptionAsync and deleteOptionAsync save the changed option list', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [island] }))
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    await act(async () => { await result.current.addOptionAsync(island, ' Doei! ') })
    await act(async () => { await result.current.deleteOptionAsync(island, 0) })

    const calls = vi.mocked(fetch).mock.calls
    expect(bodyOf(calls[0])).toEqual({ id: 'i1', options: ['Tot straks.', 'Doei!'] })
    expect(bodyOf(calls[1])).toEqual({ id: 'i1', options: [] })
  })

  it('deleteIslandAsync sends a DELETE with the id', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [] }))
    const { result } = renderHook(() => useLanguageIslands('model-a'))

    await act(async () => { await result.current.deleteIslandAsync('i1') })

    expect(fetch).toHaveBeenCalledWith('/api/language-islands', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ id: 'i1' }),
    }))
    expect(result.current.islands).toEqual([])
  })
})
