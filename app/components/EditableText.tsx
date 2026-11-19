import { useState } from 'react'

export function EditableText({ text, saving, onSave, onDelete, textClassName, multiline = false }: {
  text: string
  saving: boolean
  onSave: (text: string) => Promise<unknown>
  onDelete?: () => void
  textClassName: string
  // A text area that keeps Enter for new lines; ⌘/Ctrl+Enter saves.
  multiline?: boolean
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

  const fieldProps = {
    value: draft,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    autoFocus: true,
    className: 'flex-1 border rounded px-2 py-1 text-sm',
  }

  return (
    <div className={multiline ? 'flex flex-col gap-2' : 'flex gap-2'}>
      {multiline
        ? (
          <textarea
            {...fieldProps}
            rows={8}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); if (e.key === 'Escape') setDraft(null) }}
          />
        )
        : <input {...fieldProps} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setDraft(null) }} />}
      <span className="flex gap-2">
        <button onClick={save} disabled={saving} className="text-xs text-blue-600 hover:underline">Opslaan</button>
        <button onClick={() => setDraft(null)} className="text-xs text-gray-500 hover:underline">Annuleren</button>
      </span>
    </div>
  )
}
