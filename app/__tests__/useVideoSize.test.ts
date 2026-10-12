import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVideoSize, VIDEO_SIZE_STORAGE_KEY } from '../hooks/useVideoSize'
import { isVideoSize } from '../lib/videoSize'

describe('useVideoSize', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to groot', () => {
    const { result } = renderHook(() => useVideoSize())
    expect(result.current.size).toBe('groot')
  })

  it('loads a saved size', () => {
    localStorage.setItem(VIDEO_SIZE_STORAGE_KEY, 'klein')
    const { result } = renderHook(() => useVideoSize())
    expect(result.current.size).toBe('klein')
  })

  it('ignores an unknown saved value', () => {
    localStorage.setItem(VIDEO_SIZE_STORAGE_KEY, 'gigantisch')
    const { result } = renderHook(() => useVideoSize())
    expect(result.current.size).toBe('groot')
  })

  it('setSize changes and saves the size', () => {
    const { result } = renderHook(() => useVideoSize())

    act(() => result.current.setSize('maximaal'))

    expect(result.current.size).toBe('maximaal')
    expect(localStorage.getItem(VIDEO_SIZE_STORAGE_KEY)).toBe('maximaal')
  })
})

describe('isVideoSize', () => {
  it('accepts only the known sizes', () => {
    expect(isVideoSize('middel')).toBe(true)
    expect(isVideoSize('toString')).toBe(false)
    expect(isVideoSize(null)).toBe(false)
  })
})
