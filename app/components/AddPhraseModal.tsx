import { useEffect } from 'react'
import type { useWords } from '../hooks/useWords'
import { AddPhraseForm } from './AddPhraseForm'

interface Props {
  words: ReturnType<typeof useWords>
  open: boolean
  onClose: () => void
  onAdded?: () => void
}

export function AddPhraseModal({ words, open, onClose, onAdded }: Props) {
  const allTags = [...new Set(words.words.flatMap(w => w.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-gray-900">Frase toevoegen</h2>
          <button onClick={onClose} title="Sluiten" className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>
        <AddPhraseForm words={words} allTags={allTags} onAdded={() => { onAdded?.(); onClose() }} />
      </div>
    </div>
  )
}
