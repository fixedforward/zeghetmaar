import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHardToHearPhrases } from '../hooks/useHardToHearPhrases'

const ok = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const fail = (error: string) => ({ ok: false, json: () => Promise.resolve({ error }) } as Response)

const phrase = { id: 'h1', text: 'Dat zie je wel vaker.', seconds: 12.5, createdAt: '2024-01-01T00:00:00.000Z' }

describe('useHardToHearPhrases', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the lines of the video', async () => {
    global.fetch = vi.fn().mockResolvedValue(ok({ phrases: [phrase] }))
    const { result } = renderHook(() => useHardToHearPhrases('Het Journaal'))

    await waitFor(() => expect(result.current.phrases).toEqual([phrase]))
    expect(fetch).toHaveBeenCalledWith('/api/luisteren/hard-to-hear?video=Het%20Journaal', undefined)
  })

  it('does not load without a video', () => {
    global.fetch = vi.fn()
    renderHook(() => useHardToHearPhrases(null))

    expect(fetch).not.toHaveBeenCalled()
  })

  it('addPhraseAsync posts the line with the video and takes the server list', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(ok({ phrases: [] })).mockResolvedValueOnce(ok({ phrases: [phrase] }))
    const { result } = renderHook(() => useHardToHearPhrases('Het Journaal'))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    let saved = false
    await act(async () => { saved = await result.current.addPhraseAsync(phrase.text, 12.5, 14) })

    expect(saved).toBe(true)
    expect(fetch).toHaveBeenLastCalledWith('/api/luisteren/hard-to-hear', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ video: 'Het Journaal', text: phrase.text, seconds: 12.5, endSeconds: 14 }),
    }))
    expect(result.current.phrases).toEqual([phrase])
  })

  it('deletePhraseAsync shows the server error and keeps the list', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(ok({ phrases: [phrase] })).mockResolvedValueOnce(fail('Kon frase niet verwijderen.'))
    const { result } = renderHook(() => useHardToHearPhrases('Het Journaal'))
    await waitFor(() => expect(result.current.phrases).toEqual([phrase]))

    let saved = true
    await act(async () => { saved = await result.current.deletePhraseAsync('h1') })

    expect(saved).toBe(false)
    expect(result.current.error).toBe('Kon frase niet verwijderen.')
    expect(result.current.phrases).toEqual([phrase])
  })
})
