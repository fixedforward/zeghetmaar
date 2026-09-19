import { useEffect, useState } from 'react'

type Props = {
  allTags: string[]
  onClose: () => void
  onReload: () => void
}

export function TagsManageModal({ allTags, onClose, onReload }: Props) {
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const startRename = (tag: string) => {
    setRenamingTag(tag)
    setRenameValue(tag)
    setError(null)
  }

  const cancelRename = () => {
    setRenamingTag(null)
    setRenameValue('')
  }

  const submitRename = () => {
    if (!renamingTag || !renameValue.trim()) return
    setLoading(true)
    setError(null)
    fetch('/api/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldTag: renamingTag, newTag: renameValue.trim() }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon tag niet hernoemen')
        cancelRename()
        onReload()
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleDelete = (tag: string) => {
    setLoading(true)
    setError(null)
    fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon tag niet verwijderen')
        setDeleteConfirmTag(null)
        onReload()
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-3 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-gray-900">Tags beheren</h2>
          <button onClick={onClose} title="Sluiten" className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {allTags.length === 0 && <p className="text-sm text-gray-400">Nog geen tags.</p>}

        <ul className="space-y-1">
          {allTags.map(tag => (
            <li key={tag} className="flex items-center gap-2 border rounded px-2 py-1.5">
              {renamingTag === tag ? (
                <>
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                    className="flex-1 p-1 border rounded text-sm"
                    autoFocus
                  />
                  <button
                    onClick={submitRename}
                    disabled={loading || !renameValue.trim()}
                    className="text-xs text-blue-600 hover:underline disabled:opacity-50 shrink-0"
                  >
                    Opslaan
                  </button>
                  <button onClick={cancelRename} className="text-xs text-gray-500 hover:underline shrink-0">
                    Annuleren
                  </button>
                </>
              ) : deleteConfirmTag === tag ? (
                <>
                  <span className="text-sm text-gray-700 flex-1 truncate">{tag}</span>
                  <span className="text-xs text-gray-600 shrink-0">Verwijderen?</span>
                  <button
                    onClick={() => handleDelete(tag)}
                    disabled={loading}
                    className="text-xs text-red-600 hover:underline font-medium shrink-0"
                  >
                    Ja
                  </button>
                  <button onClick={() => setDeleteConfirmTag(null)} className="text-xs text-gray-500 hover:underline shrink-0">
                    Nee
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-gray-700 flex-1 truncate">{tag}</span>
                  <button onClick={() => startRename(tag)} className="text-xs text-blue-600 hover:underline shrink-0" title="Hernoemen">
                    ✎
                  </button>
                  <button
                    onClick={() => setDeleteConfirmTag(tag)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                    title="Verwijderen"
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
