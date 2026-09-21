import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOefenSessie } from '../hooks/useOefenSessie'
import type { WordEntry } from '../types'

// Keep phrase order deterministic — these tests assert on which phrase ends
// up at which index, which the real shuffle would make flaky.
vi.mock('../lib/shuffle', () => ({ shuffleArray: (arr: unknown[]) => arr }))

const now = new Date().toISOString()
const makePhrase = (id: string, word: string): WordEntry => ({ id, word, translation: word, examples: [], updatedAt: now })

const words: WordEntry[] = [
  makePhrase('1', 'a'),
  makePhrase('2', 'b'),
  makePhrase('3', 'c'),
]

// Mocks /api/chat, replying with a prompt derived from the requested word so
// each phrase's prefetched prompt is distinguishable in assertions.
function mockChatFetch(): typeof fetch {
  return vi.fn((_url, options) => {
    const { text } = JSON.parse((options as RequestInit).body as string)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ response: `Vraag voor ${text}` }),
    } as Response)
  }) as unknown as typeof fetch
}

describe('useOefenSessie prompt prefetching', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('refreshPreview fetches a prompt for every previewed phrase in the background', async () => {
    global.fetch = mockChatFetch()
    const { result } = renderHook(() => useOefenSessie('gpt-4o-mini'))

    await act(async () => {
      result.current.refreshPreview(words)
    })

    expect(result.current.previewPhrases).toHaveLength(3)
    expect(fetch).toHaveBeenCalledTimes(3)
    // Nothing is displayed yet — no session has started.
    expect(result.current.prompt).toBe('')
  })

  it('startSession shows the prefetched prompt instantly, with no extra fetch', async () => {
    global.fetch = mockChatFetch()
    const { result } = renderHook(() => useOefenSessie('gpt-4o-mini'))

    await act(async () => { result.current.refreshPreview(words) })
    expect(fetch).toHaveBeenCalledTimes(3)

    act(() => { result.current.startSession(1) })

    // Cache hit: prompt is set synchronously, no loading state, no new fetch.
    expect(result.current.promptLoading).toBe(false)
    expect(result.current.prompt).toBe('Vraag voor b')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('nextPhrase and previousPhrase reuse cached prompts without refetching', async () => {
    global.fetch = mockChatFetch()
    const { result } = renderHook(() => useOefenSessie('gpt-4o-mini'))

    await act(async () => { result.current.refreshPreview(words) })
    act(() => { result.current.startSession(0) })
    expect(fetch).toHaveBeenCalledTimes(3)

    act(() => { result.current.nextPhrase() })
    expect(result.current.prompt).toBe('Vraag voor b')
    expect(fetch).toHaveBeenCalledTimes(3)

    act(() => { result.current.nextPhrase() })
    expect(result.current.prompt).toBe('Vraag voor c')
    expect(fetch).toHaveBeenCalledTimes(3)

    act(() => { result.current.previousPhrase() })
    expect(result.current.prompt).toBe('Vraag voor b')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('starting a session before prefetch resolves shows loading, then the result, without a duplicate fetch', async () => {
    const resolvers: Record<string, (v: unknown) => void> = {}
    global.fetch = vi.fn((_url, options) => {
      const { text } = JSON.parse((options as RequestInit).body as string)
      return new Promise(resolve => { resolvers[text] = resolve })
    }) as unknown as typeof fetch

    const { result } = renderHook(() => useOefenSessie('gpt-4o-mini'))

    act(() => { result.current.refreshPreview(words) })
    expect(fetch).toHaveBeenCalledTimes(3)

    // Start before the prefetch for "a" has resolved — should share that
    // in-flight request instead of firing a second one.
    act(() => { result.current.startSession(0) })
    expect(result.current.promptLoading).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(3)

    await act(async () => {
      resolvers['a']({ ok: true, json: () => Promise.resolve({ response: 'Vraag voor a' }) })
    })

    expect(result.current.promptLoading).toBe(false)
    expect(result.current.prompt).toBe('Vraag voor a')
    expect(fetch).toHaveBeenCalledTimes(3) // still just the original prefetch call
  })

  it('regeneratePrompt always fetches fresh and updates the cache for later navigation', async () => {
    global.fetch = mockChatFetch()
    const { result } = renderHook(() => useOefenSessie('gpt-4o-mini'))

    await act(async () => { result.current.refreshPreview(words) })
    act(() => { result.current.startSession(0) })
    expect(result.current.prompt).toBe('Vraag voor a')
    expect(fetch).toHaveBeenCalledTimes(3)

    // Change what the mock returns, to prove regenerate bypasses the cache.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Nieuwe vraag voor a' }),
    } as Response)

    await act(async () => { result.current.regeneratePrompt() })
    expect(result.current.prompt).toBe('Nieuwe vraag voor a')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Navigating away and back should show the regenerated prompt, not the
    // originally prefetched one — proving the cache was updated.
    act(() => { result.current.nextPhrase() })
    act(() => { result.current.previousPhrase() })
    expect(result.current.prompt).toBe('Nieuwe vraag voor a')
  })
})
