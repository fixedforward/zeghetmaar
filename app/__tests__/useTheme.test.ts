import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '../hooks/useTheme'

const isDark = () => document.documentElement.classList.contains('dark')

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  it('starts with systeem, or the saved choice', () => {
    expect(renderHook(() => useTheme()).result.current.theme).toBe('systeem')

    localStorage.setItem('theme', 'donker')
    expect(renderHook(() => useTheme()).result.current.theme).toBe('donker')
  })

  it('ignores a saved value that is not a choice', () => {
    localStorage.setItem('theme', 'paars')

    expect(renderHook(() => useTheme()).result.current.theme).toBe('systeem')
  })

  it('setTheme saves the choice and switches the page right away', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setTheme('donker'))
    expect(result.current.theme).toBe('donker')
    expect(localStorage.getItem('theme')).toBe('donker')
    expect(isDark()).toBe(true)

    act(() => result.current.setTheme('systeem'))
    expect(isDark()).toBe(false)
  })
})
