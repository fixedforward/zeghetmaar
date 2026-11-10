import { useEffect, type ReactNode } from 'react'

export interface FocusShortcut {
  keys: string
  label: string
}

type Props = {
  title: string
  progress?: { current: number; total: number }
  status?: ReactNode
  shortcuts?: FocusShortcut[]
  onStop: () => void
  children: ReactNode
}

// The dark full-screen view a practice session runs in, so the rest of the app is out of
// sight. What's inside keeps its normal classes: `.focus-mode` in globals.css turns them dark.
export function FocusScreen({ title, progress, status, shortcuts = [], onStop, children }: Props) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const current = progress ? Math.min(progress.current, progress.total) : 0
  const percent = progress && progress.total > 0 ? (current / progress.total) * 100 : 0

  return (
    <section aria-label={title} className="focus-mode fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#0e141b] text-gray-900">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7 sm:py-4">
        <button
          type="button"
          onClick={onStop}
          className="min-h-11 px-4 rounded-xl border text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          ✕ Stoppen
        </button>
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <div className="flex items-center gap-3 text-sm">
          {progress && <span className="font-bold">{current} / {progress.total}</span>}
          {status && <span className="text-gray-500">{status}</span>}
        </div>
      </header>
      {progress && (
        <div
          role="progressbar"
          aria-label="Voortgang"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={current}
          className="h-1 shrink-0 bg-gray-100"
        >
          <div className="h-full bg-teal-400 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-10">{children}</div>
      {shortcuts.length > 0 && (
        <ul aria-label="Sneltoetsen" className="hidden sm:flex flex-wrap justify-center gap-5 px-4 pb-6 text-xs text-gray-500">
          {shortcuts.map(s => (
            <li key={s.keys} className="flex items-center gap-2">
              <kbd className="font-mono text-xs text-gray-900 px-2 py-0.5 rounded-md border bg-white">{s.keys}</kbd>
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
