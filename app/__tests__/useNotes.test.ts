import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotes } from '../hooks/useNotes'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const fail = (error: string) => ({ ok: false, json: () => Promise.resolve({ error }) } as Response)

const note = { id: 'n1', title: 'Grammatica', text: 'Om te', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }

type FetchInit = { method?: string; body?: string }

describe('useNotes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('loads the notes once', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ notes: [note] }))
    const { result } = renderHook(() => useNotes())

    await act(async () => { result.current.loadNotes() })
    await act(async () => { result.current.loadNotes() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/notes', undefined)
    expect(result.current.notes).toEqual([note])
  })

  it('sends add, edit and delete requests and keeps the saved list', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ notes: [note] }))
    const { result } = renderHook(() => useNotes())

    await act(async () => { await result.current.addNoteAsync('Grammatica', 'Om te') })
    await act(async () => { await result.current.setTitleAsync('n1', 'Regels') })
    await act(async () => { await result.current.setTextAsync('n1', 'Om te + infinitief') })
    await act(async () => { await result.current.deleteNoteAsync('n1') })

    const calls = vi.mocked(fetch).mock.calls.map(c => ({ method: (c[1] as FetchInit).method, body: JSON.parse((c[1] as FetchInit).body ?? '{}') }))
    expect(calls).toEqual([
      { method: 'POST', body: { title: 'Grammatica', text: 'Om te' } },
      { method: 'PUT', body: { id: 'n1', title: 'Regels' } },
      { method: 'PUT', body: { id: 'n1', text: 'Om te + infinitief' } },
      { method: 'DELETE', body: { id: 'n1' } },
    ])
    expect(result.current.notes).toEqual([note])
  })

  it('shows the error and returns false when saving fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(fail('Schrijf een notitie.'))
    const { result } = renderHook(() => useNotes())

    let done = true
    await act(async () => { done = await result.current.addNoteAsync('', ' ') })

    expect(done).toBe(false)
    expect(result.current.error).toBe('Schrijf een notitie.')
  })
})
