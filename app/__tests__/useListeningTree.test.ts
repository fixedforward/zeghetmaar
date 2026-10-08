import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useListeningTree } from '../hooks/useListeningTree'

const tree = { id: 'root1', name: '', files: [], folders: [{ id: 'f1', name: 'Les 14', folders: [], files: [{ id: 'v1', name: 'Les 14.mp4', hasSubtitles: true }] }] }

describe('useListeningTree', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the tree once, even when loadTree is called again', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(tree) } as Response)
    const { result } = renderHook(() => useListeningTree())

    await act(async () => { result.current.loadTree() })
    await act(async () => { result.current.loadTree() })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/luisteren/tree')
    expect(result.current.tree).toEqual(tree)
    expect(result.current.loading).toBe(false)
  })

  it('shows the API error and retries only when forced', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Luisteren-map is niet geconfigureerd.' }) } as Response)
    const { result } = renderHook(() => useListeningTree())

    await act(async () => { result.current.loadTree() })
    expect(result.current.error).toBe('Luisteren-map is niet geconfigureerd.')

    await act(async () => { result.current.loadTree() })
    expect(fetch).toHaveBeenCalledTimes(1)

    await act(async () => { result.current.loadTree(true) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
