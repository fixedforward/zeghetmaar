import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePhrasePractice } from '../hooks/usePhrasePractice'
import type { WordEntry } from '../types'

const mockPhrase: WordEntry = { id: '1', word: 'iets van maken', translation: 'to make something of it', examples: [], updatedAt: new Date().toISOString() }
const otherPhrase1: WordEntry = { id: '2', word: 'gezellig', translation: 'cozy', examples: [], updatedAt: new Date().toISOString() }
const otherPhrase2: WordEntry = { id: '3', word: 'onverwijld', translation: 'immediately', examples: [], updatedAt: new Date().toISOString() }
const allWords = [mockPhrase, otherPhrase1, otherPhrase2]

const mockFetch = (response: string) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ response }),
  } as Response)

describe('usePhrasePractice', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('starts with closed state', () => {
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))

    expect(result.current.isOpen).toBe(false)
    expect(result.current.currentPhrase).toBeNull()
    expect(result.current.prompt).toBe('')
    expect(result.current.userAnswer).toBe('')
    expect(result.current.evaluation).toBe('')
  })

  it('open() sets isOpen, currentPhrase and calls chatRequest for prompt', async () => {
    global.fetch = mockFetch('Wat ga je vandaag doen?')

    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))

    await act(async () => {
      result.current.open(mockPhrase)
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.currentPhrase).toEqual(mockPhrase)
    expect(result.current.prompt).toBe('Wat ga je vandaag doen?')
    expect(result.current.promptLoading).toBe(false)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('open() picks two other words from allWords and excludes them (like the target) from the generated question', async () => {
    global.fetch = mockFetch('Wat ga je vandaag doen?')

    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', allWords))

    await act(async () => {
      result.current.open(mockPhrase)
    })

    expect(result.current.extraWords.map(w => w.id).sort()).toEqual(['2', '3'])

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.prompt).toContain('GEEN van deze frasen zelf bevatten')
    expect(body.prompt).toContain('"gezellig"')
    expect(body.prompt).toContain('"onverwijld"')
  })

  it('promptLoading is true during generation then false after', async () => {
    let resolve: (v: unknown) => void
    global.fetch = vi.fn().mockReturnValue(
      new Promise(r => { resolve = r })
    )

    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))

    act(() => { result.current.open(mockPhrase) })
    expect(result.current.promptLoading).toBe(true)

    await act(async () => {
      resolve!({ ok: true, json: () => Promise.resolve({ response: 'Hoe gaat het?' }) })
    })
    expect(result.current.promptLoading).toBe(false)
  })

  it('close() resets all state', async () => {
    global.fetch = mockFetch('Hoe gaat het?')

    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))

    await act(async () => { result.current.open(mockPhrase) })
    act(() => { result.current.close() })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.currentPhrase).toBeNull()
    expect(result.current.prompt).toBe('')
    expect(result.current.userAnswer).toBe('')
    expect(result.current.evaluation).toBe('')
    expect(result.current.promptLoading).toBe(false)
    expect(result.current.evaluationLoading).toBe(false)
  })

  it('regeneratePrompt() fires a new chatRequest and clears answer and evaluation', async () => {
    global.fetch = mockFetch('Eerste vraag')
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))
    await act(async () => { result.current.open(mockPhrase) })

    global.fetch = mockFetch('Tweede vraag')
    await act(async () => { result.current.regeneratePrompt() })

    expect(result.current.prompt).toBe('Tweede vraag')
    expect(result.current.userAnswer).toBe('')
    expect(result.current.evaluation).toBe('')
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('submitAnswer() calls chatRequest with evaluation prompt and stores result', async () => {
    global.fetch = mockFetch('Hoe gaat het?')
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))
    await act(async () => { result.current.open(mockPhrase) })

    act(() => { result.current.setUserAnswer('Het gaat goed, ik ga er iets van maken!') })

    global.fetch = mockFetch('Evaluatie: Goed gedaan!\nSuggestie: Probeer de zin iets korter te maken.')
    await act(async () => { result.current.submitAnswer() })

    expect(result.current.evaluation).toBe('Evaluatie: Goed gedaan!\nSuggestie: Probeer de zin iets korter te maken.')
    expect(result.current.evaluationLoading).toBe(false)
  })

  it('submitAnswer() tells the evaluator to check for all three phrases, not just the target one', async () => {
    global.fetch = mockFetch('Wat ga je vandaag doen?')
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', allWords))
    await act(async () => { result.current.open(mockPhrase) })

    act(() => { result.current.setUserAnswer('Ik ga er gezellig en onverwijld iets van maken!') })

    global.fetch = mockFetch('Evaluatie: Goed!\nSuggestie: Geen.')
    await act(async () => { result.current.submitAnswer() })

    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse((options as RequestInit).body as string)
    expect(body.prompt).toContain('"iets van maken"')
    expect(body.prompt).toContain('"gezellig"')
    expect(body.prompt).toContain('"onverwijld"')
  })

  it('evaluationLoading is true during submitAnswer then false after', async () => {
    global.fetch = mockFetch('Hoe gaat het?')
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))
    await act(async () => { result.current.open(mockPhrase) })
    act(() => { result.current.setUserAnswer('Mijn antwoord') })

    let resolve: (v: unknown) => void
    global.fetch = vi.fn().mockReturnValue(new Promise(r => { resolve = r }))

    act(() => { result.current.submitAnswer() })
    expect(result.current.evaluationLoading).toBe(true)

    await act(async () => {
      resolve!({ ok: true, json: () => Promise.resolve({ response: 'Evaluatie: Prima!\nSuggestie: Geen.' }) })
    })
    expect(result.current.evaluationLoading).toBe(false)
  })

  it('submitAnswer() does nothing when userAnswer is empty', async () => {
    global.fetch = mockFetch('Hoe gaat het?')
    const { result } = renderHook(() => usePhrasePractice('gpt-4o-mini', [mockPhrase]))
    await act(async () => { result.current.open(mockPhrase) })

    global.fetch = vi.fn()
    act(() => { result.current.submitAnswer() })

    expect(result.current.evaluationLoading).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
