import { describe, it, expect, vi, beforeEach } from 'vitest'
import { THEME_INIT_SCRIPT, isDarkTheme, isThemeChoice } from '../lib/theme'

function mockSystemDark(matches: boolean) {
  const listeners: (() => void)[] = []
  const media = { matches, addEventListener: (_: string, fn: () => void) => listeners.push(fn) }
  window.matchMedia = vi.fn().mockReturnValue(media)
  return { media, fireChange: () => listeners.forEach(fn => fn()) }
}

const isDark = () => document.documentElement.classList.contains('dark')

describe('isDarkTheme', () => {
  it('is dark for donker, light for licht, and follows the system for systeem', () => {
    expect(isDarkTheme('donker', false)).toBe(true)
    expect(isDarkTheme('licht', true)).toBe(false)
    expect(isDarkTheme('systeem', true)).toBe(true)
    expect(isDarkTheme('systeem', false)).toBe(false)
  })
})

describe('isThemeChoice', () => {
  it('only accepts the three choices', () => {
    expect(['systeem', 'licht', 'donker'].every(isThemeChoice)).toBe(true)
    expect(isThemeChoice('dark')).toBe(false)
    expect(isThemeChoice(null)).toBe(false)
  })
})

describe('THEME_INIT_SCRIPT', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('makes the page dark when donker is saved, even on a light system', () => {
    mockSystemDark(false)
    localStorage.setItem('theme', 'donker')

    new Function(THEME_INIT_SCRIPT)()

    expect(isDark()).toBe(true)
  })

  it('keeps the page light when licht is saved, even on a dark system', () => {
    mockSystemDark(true)
    localStorage.setItem('theme', 'licht')

    new Function(THEME_INIT_SCRIPT)()

    expect(isDark()).toBe(false)
  })

  it('follows the system when nothing is saved, also when it changes later', () => {
    const { media, fireChange } = mockSystemDark(false)

    new Function(THEME_INIT_SCRIPT)()
    expect(isDark()).toBe(false)

    media.matches = true
    fireChange()
    expect(isDark()).toBe(true)
  })
})
