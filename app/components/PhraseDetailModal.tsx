import { useEffect } from 'react'
import type { useWords } from '../hooks/useWords'
import { TagsSelect } from './TagsSelect'
import { MeaningsEditor } from './MeaningsEditor'

type Props = ReturnType<typeof useWords> & { isLoggedIn: boolean }

export function PhraseDetailModal(words: Props) {
  const entry = words.words.find(w => w.id === words.editId) ?? null
  const allTags = [...new Set(words.words.flatMap(w => w.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  )

  useEffect(() => {
    if (!entry) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') words.cancelEdit() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entry, words])

  if (!entry) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={words.cancelEdit}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="font-semibold text-gray-900">Frase bewerken</h2>
          <button onClick={words.cancelEdit} title="Sluiten" className="text-gray-400 hover:text-gray-600 leading-none shrink-0">✕</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frase</label>
          <input
            type="text"
            value={words.editWord}
            onChange={(e) => words.setEditWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && words.handleEditWord()}
            className="w-full p-2 border rounded"
          />
        </div>

        <MeaningsEditor
          meanings={words.editMeanings}
          onChange={words.setEditMeanings}
          word={words.editWord}
          onGenerateTranslation={(w, i) => words.generateAiTranslation(w, 'edit', i)}
          onGenerateExamples={(w, i) => words.generateAiExamples(w, 'edit', i)}
          translationLoading={words.aiTranslationLoading}
          examplesLoading={words.aiExamplesLoading}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <TagsSelect allTags={allTags} selected={words.editTags} onChange={words.setEditTags} />
        </div>

        <div className="flex items-center gap-3 border-t pt-3">
          <button
            onClick={() => words.toggleFavorite(entry.id, !!entry.isFavorite)}
            disabled={words.favoriteLoadingId === entry.id}
            className={`text-lg leading-none disabled:opacity-50 transition-colors ${entry.isFavorite ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
            title={entry.isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
          >
            {entry.isFavorite ? '★' : '☆'}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Beheersing:</span>
            {([1, 2, 3] as const).map(n => (
              <button
                key={n}
                onClick={() => words.setBeheersing(entry.id, n)}
                disabled={words.beheersingLoadingId === entry.id}
                title={`Beheersing ${n}`}
                className={[
                  'w-6 h-6 rounded text-xs font-bold transition-colors disabled:opacity-50',
                  entry.beheersing === n
                    ? n === 1 ? 'bg-red-400 text-white'
                      : n === 2 ? 'bg-yellow-400 text-white'
                      : 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2 items-center pt-3">
            {words.isLoggedIn ? (
              <button
                onClick={words.handleEditWord}
                disabled={words.editLoading || !words.editWord.trim() || !words.editMeanings.some(m => m.translation.trim())}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                {words.editLoading ? 'Opslaan...' : 'Opslaan'}
              </button>
            ) : (
              <p className="text-sm text-gray-500 italic">Log in om wijzigingen op te slaan.</p>
            )}
            <button
              onClick={words.cancelEdit}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Annuleren
            </button>
          </div>

          {words.isLoggedIn && (
            words.deleteConfirmId === entry.id ? (
              <span className="flex items-center gap-1 text-xs pt-3">
                <span className="text-gray-600">Verwijderen?</span>
                <button
                  onClick={() => words.handleDeleteWord(entry.id)}
                  disabled={words.deleteLoading}
                  className="text-red-600 hover:underline font-medium"
                >
                  Ja
                </button>
                <button
                  onClick={() => words.setDeleteConfirmId(null)}
                  className="text-gray-500 hover:underline"
                >
                  Nee
                </button>
              </span>
            ) : (
              <button
                onClick={() => words.setDeleteConfirmId(entry.id)}
                className="text-red-400 hover:text-red-600 text-sm pt-3"
                title="Verwijderen"
              >
                ✕ Verwijderen
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
