import { useState, useEffect, useCallback } from 'react'
import type { Tab } from '../types'
import { ALL_TABS, DEFAULT_HIDDEN_TABS } from '../config/tabs'

const STORAGE_KEY = 'tab-settings'

interface StoredTabSettings {
  order: Tab[]
  hidden: Tab[]
}

// Merges what's saved with the app's current tab list, so a tab added after
// the setting was saved shows up (visible, appended at the end) instead of
// silently disappearing, and a removed tab id is dropped instead of lingering.
function normalize(stored: StoredTabSettings | null): { order: Tab[]; hidden: Set<Tab> } {
  const storedOrder = (stored?.order ?? []).filter(t => ALL_TABS.includes(t))
  const missing = ALL_TABS.filter(t => !storedOrder.includes(t))
  const order = [...storedOrder, ...missing]
  const hidden = new Set((stored?.hidden ?? DEFAULT_HIDDEN_TABS).filter(t => ALL_TABS.includes(t)))
  return { order, hidden }
}

export function useTabSettings() {
  const [order, setOrder] = useState<Tab[]>(ALL_TABS)
  const [hidden, setHidden] = useState<Set<Tab>>(new Set(DEFAULT_HIDDEN_TABS))
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed: StoredTabSettings | null = stored ? JSON.parse(stored) : null
      const { order: nextOrder, hidden: nextHidden } = normalize(parsed)
      setOrder(nextOrder)
      setHidden(nextHidden)
    } catch {
      // localStorage unavailable or corrupt — keep the defaults.
    }
  }, [])

  const persist = useCallback((nextOrder: Tab[], nextHidden: Set<Tab>) => {
    setOrder(nextOrder)
    setHidden(nextHidden)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: nextOrder, hidden: [...nextHidden] }))
    } catch {
      // Setting just won't persist across reloads.
    }
  }, [])

  const toggleVisible = useCallback((tab: Tab) => {
    const next = new Set(hidden)
    if (next.has(tab)) {
      next.delete(tab)
    } else {
      const stillVisible = order.filter(t => t !== tab && !next.has(t))
      if (stillVisible.length === 0) return // always keep at least one tab visible
      next.add(tab)
    }
    persist(order, next)
  }, [order, hidden, persist])

  const moveUp = useCallback((tab: Tab) => {
    const idx = order.indexOf(tab)
    if (idx <= 0) return
    const next = [...order]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    persist(next, hidden)
  }, [order, hidden, persist])

  const moveDown = useCallback((tab: Tab) => {
    const idx = order.indexOf(tab)
    if (idx === -1 || idx >= order.length - 1) return
    const next = [...order]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    persist(next, hidden)
  }, [order, hidden, persist])

  return {
    order,
    hidden,
    visibleTabs: order.filter(t => !hidden.has(t)),
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggleVisible,
    moveUp,
    moveDown,
  }
}
