import { useEffect } from 'react'
import { isTypingTarget } from '../lib/keyboard'

// Anki-style card keys, shared by Cloze kaarten, Quiz and Taaleilanden: Space/Enter shows
// the answer, then 1 = Fout and 2 = Goed. Keys typed in a field or with ⌘/Ctrl/Alt are left alone.
export function useRevealMarkShortcuts(active: boolean, revealed: boolean, reveal: () => void, mark: (correct: boolean) => void) {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        reveal()
      } else if (revealed && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        mark(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, revealed, reveal, mark])
}
