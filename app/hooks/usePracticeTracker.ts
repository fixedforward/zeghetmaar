import { useCallback, useRef, useState } from 'react'
import type { PracticeLogType } from '../lib/practiceLog'
import { todayLocalIso } from '../lib/date'

export function usePracticeTracker(logType: PracticeLogType, isLoggedIn: boolean) {
  const [practicedDates, setPracticedDates] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  // Tracks *which* date was optimistically marked, not just whether one was —
  // a bare boolean would stay stuck "true" past midnight in a tab left open,
  // blocking the next day's mark. Guards a rapid double-call before the
  // practicedDates state update lands; the real source of truth is still
  // practicedDates itself.
  const markedDateRef = useRef<string | null>(null)

  const loadPracticeLog = useCallback(() => {
    if (!isLoggedIn || loaded) return
    setLoaded(true)
    fetch(`/api/practice-log/${logType}`)
      .then(res => {
        if (!res.ok) throw new Error('Kon oefenlog niet laden.')
        return res.json()
      })
      .then((data: { dates: string[] }) => setPracticedDates(new Set(data.dates)))
      .catch(err => console.error(`[usePracticeTracker:${logType}]`, err instanceof Error ? err.message : err))
  }, [logType, isLoggedIn, loaded])

  // Used both automatically (a real action in the tab) and manually (a
  // "check in" button) — either way it's a no-op once today is already marked.
  const markPracticedToday = useCallback(() => {
    if (!isLoggedIn) return
    const date = todayLocalIso()
    if (markedDateRef.current === date || practicedDates.has(date)) return
    markedDateRef.current = date

    setPracticedDates(prev => new Set(prev).add(date))
    fetch(`/api/practice-log/${logType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }).catch(err => console.error(`[usePracticeTracker:${logType}] Failed to save practiced date —`, err))
  }, [logType, isLoggedIn, practicedDates])

  // Undoes today's check-in (manual or automatic) — a later real action or
  // manual check-in today can mark it again.
  const cancelPracticedToday = useCallback(() => {
    if (!isLoggedIn) return
    const date = todayLocalIso()
    if (!practicedDates.has(date)) return
    if (markedDateRef.current === date) markedDateRef.current = null

    setPracticedDates(prev => {
      const next = new Set(prev)
      next.delete(date)
      return next
    })
    fetch(`/api/practice-log/${logType}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }).catch(err => console.error(`[usePracticeTracker:${logType}] Failed to cancel practiced date —`, err))
  }, [logType, isLoggedIn, practicedDates])

  return { practicedDates, loadPracticeLog, markPracticedToday, cancelPracticedToday }
}
