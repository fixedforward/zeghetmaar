import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { LAST_VIDEO_STORAGE_KEY, saveLastVideo, useLastVideo } from '../hooks/useLastVideo'

const video = { folderId: 'f1', fileId: 'v1', name: 'Les 3.mp4' }

describe('useLastVideo', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the video saved last', () => {
    saveLastVideo({ folderId: 'f1', fileId: 'v0', name: 'Les 2.mp4' })
    saveLastVideo(video)

    const { result } = renderHook(() => useLastVideo())

    expect(result.current).toEqual(video)
  })

  it('returns null when nothing was saved', () => {
    const { result } = renderHook(() => useLastVideo())
    expect(result.current).toBeNull()
  })

  it('returns null for a broken or incomplete stored value', () => {
    localStorage.setItem(LAST_VIDEO_STORAGE_KEY, '{not json')
    expect(renderHook(() => useLastVideo()).result.current).toBeNull()

    localStorage.setItem(LAST_VIDEO_STORAGE_KEY, JSON.stringify({ folderId: 'f1' }))
    expect(renderHook(() => useLastVideo()).result.current).toBeNull()
  })
})
