import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLanguageIslands } from '../hooks/useLanguageIslands'
import { openChatGptInBackground } from '../lib/chatgpt'

vi.mock('../lib/chatgpt', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/chatgpt')>()),
  openChatGptInBackground: vi.fn(),
}))

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
    const { result } = renderHook(() => useLanguageIslands())

    await act(async () => { result.current.loadIslands() })
    await act(async () => { result.current.loadIslands() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.islands).toEqual([island])

    await act(async () => { result.current.loadIslands(true) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('addIslandAsync posts the phrase and does not call the AI', async () => {
    const added = { ...island, options: [] }
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [added] }))
    const { result } = renderHook(() => useLanguageIslands())

    let done = false
    await act(async () => { done = await result.current.addIslandAsync('See you later') })

    expect(done).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/language-islands', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ english: 'See you later' }),
    }))
    expect(result.current.islands).toEqual([added])
  })

  it('askChatGpt opens ChatGPT with the phrase and the options I already have', () => {
    global.fetch = vi.fn()
    const { result } = renderHook(() => useLanguageIslands())

    result.current.askChatGpt(island)

    const url = vi.mocked(openChatGptInBackground).mock.calls[0][0]
    const prompt = new URL(url).searchParams.get('q')
    expect(url.startsWith('https://chatgpt.com/?q=')).toBe(true)
    expect(prompt).toContain('"See you later"')
    expect(prompt).toContain('- Tot straks.')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('addIslandAsync shows the server error and returns false on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue(fail('Vul een Engelse frase in.'))
    const { result } = renderHook(() => useLanguageIslands())

    let done = true
    await act(async () => { done = await result.current.addIslandAsync('') })

    expect(done).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('Vul een Engelse frase in.')
  })

  it('addOptionAsync and deleteOptionAsync save the changed option list', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [island] }))
    const { result } = renderHook(() => useLanguageIslands())

    await act(async () => { await result.current.addOptionAsync(island, ' Doei! ') })
    await act(async () => { await result.current.deleteOptionAsync(island, 0) })

    const calls = vi.mocked(fetch).mock.calls
    expect(bodyOf(calls[0])).toEqual({ id: 'i1', options: ['Tot straks.', 'Doei!'] })
    expect(bodyOf(calls[1])).toEqual({ id: 'i1', options: [] })
  })

  it('setEnglishAsync saves the changed English phrase', async () => {
    const saved = { ...island, english: 'See you soon' }
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [saved] }))
    const { result } = renderHook(() => useLanguageIslands())

    await act(async () => { await result.current.setEnglishAsync('i1', 'See you soon') })

    expect(fetch).toHaveBeenCalledWith('/api/language-islands', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ id: 'i1', english: 'See you soon' }),
    }))
    expect(result.current.islands).toEqual([saved])
  })

  it('deleteIslandAsync sends a DELETE with the id', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ islands: [] }))
    const { result } = renderHook(() => useLanguageIslands())

    await act(async () => { await result.current.deleteIslandAsync('i1') })

    expect(fetch).toHaveBeenCalledWith('/api/language-islands', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ id: 'i1' }),
    }))
    expect(result.current.islands).toEqual([])
  })
})
