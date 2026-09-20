import { useEffect, useRef, useState } from 'react'

type Props = {
  allTags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TagsSelect({ allTags, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  const addNewTag = () => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    if (!selected.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...selected, trimmed])
    }
    setNewTag('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex flex-wrap gap-1 items-center p-2 border rounded text-left min-h-[42px]"
      >
        {selected.length === 0 && <span className="text-gray-400 text-sm">Selecteer tags...</span>}
        {selected.map(tag => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{tag}</span>
        ))}
        <span className="ml-auto text-gray-400 text-xs shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded shadow-md w-full max-h-56 overflow-y-auto">
          {allTags.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Nog geen tags. Maak er hieronder een.</p>
          )}
          {allTags.map(tag => (
            <label key={tag} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} />
              {tag}
            </label>
          ))}
          <div className="flex gap-1 p-2 border-t sticky bottom-0 bg-white">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addNewTag() }
              }}
              placeholder="Nieuwe tag..."
              className="flex-1 p-1 border rounded text-sm"
            />
            <button
              type="button"
              onClick={addNewTag}
              disabled={!newTag.trim()}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              + Toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
