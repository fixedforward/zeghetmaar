import { useState } from 'react'

export function EditableText({ text, saving, onSave, onDelete, textClassName }: {
  text: string
  saving: boolean
  onSave: (text: string) => Promise<unknown>
  onDelete?: () => void
  textClassName: string
}) {
  const [draft, setDraft] = useState<string | null>(null)

  if (draft === null) {
    return (
      <div className="flex items-start justify-between gap-2 group">
        <span className={textClassName}>{text}</span>
        <span className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100">
          <button onClick={() => setDraft(text)} className="text-xs text-gray-500 hover:underline">Bewerken</button>
          {onDelete && <button onClick={onDelete} disabled={saving} title="Optie verwijderen" className="text-xs text-red-400 hover:text-red-600">✕</button>}
        </span>
      </div>
    )
  }

  const save = async () => {
    if (!draft.trim() || draft.trim() === text) return setDraft(null)
    await onSave(draft.trim())
    setDraft(null)
  }

  return (
    <div className="flex gap-2">
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }}
        autoFocus
        className="flex-1 border rounded px-2 py-1 text-sm"
      />
      <button onClick={save} disabled={saving} className="text-xs text-blue-600 hover:underline">Opslaan</button>
      <button onClick={() => setDraft(null)} className="text-xs text-gray-500 hover:underline">Annuleren</button>
    </div>
  )
}
