import { useState, useEffect } from 'react'
import { THEME_STORAGE_KEY, isDarkTheme, isThemeChoice, type ThemeChoice } from '../lib/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeChoice>('systeem')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (isThemeChoice(stored)) setThemeState(stored)
    } catch {}
  }, [])

  const setTheme = (choice: ThemeChoice) => {
    setThemeState(choice)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, choice)
    } catch {}
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', isDarkTheme(choice, systemPrefersDark))
  }

  return { theme, setTheme }
}
