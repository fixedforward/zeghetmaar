import { useState } from 'react'
import type { useWords } from '../hooks/useWords'
import type { WordEntry } from '../types'

type Props = ReturnType<typeof useWords> & { isLoggedIn: boolean; onPractice: (entry: WordEntry) => void }
type SortKey = 'updatedAt' | 'lastPracticedAt' | 'isFavorite' | 'beheersing'

const PAGE_SIZE = 10

export function FraselijstTab(words: Props) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('beheersing')
  const [sortAsc, setSortAsc] = useState(true)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const sortLabels: Record<SortKey, string> = {
    updatedAt: 'Bijgewerkt',
    lastPracticedAt: 'Laatst geoefend',
    isFavorite: 'Favoriet',
    beheersing: 'Beheersing',
  }

  const sortedWords = [...words.words].sort((a, b) => {
    let result: number
    if (sortKey === 'isFavorite') {
      result = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)
    } else if (sortKey === 'beheersing') {
      result = (b.beheersing ?? 0) - (a.beheersing ?? 0)
    } else {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (!aVal && !bVal) return 0
      if (!aVal) return 1
      if (!bVal) return -1
      result = new Date(bVal).getTime() - new Date(aVal).getTime()
    }
    return sortAsc ? -result : result
  })

  const totalPages = Math.max(1, Math.ceil(sortedWords.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageWords = sortedWords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Opgeslagen woorden en zinnen met vertaling en voorbeeldgebruik.
        </p>
        {words.isLoggedIn && (
          <button
            onClick={() => words.setShowAddForm(!words.showAddForm)}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
          >
            {words.showAddForm ? '✕ Sluiten' : '+ Frase toevoegen'}
          </button>
        )}
      </div>

      {words.showAddForm && (
        <div className="border rounded p-4 bg-gray-50 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frase</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={words.newWord}
                onChange={(e) => words.setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && words.handleAddWord()}
                placeholder="bijv. gele koorts komt niet voor in Amerika"
                className="flex-1 p-2 border rounded"
              />
              {words.newWord && (
                <button
                  onClick={() => words.setNewWord('')}
                  className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
                  title="Wissen"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={words.newTranslation}
                onChange={(e) => words.setNewTranslation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && words.handleAddWord()}
                placeholder="bijv. yellow fever does not occur in America"
                className="flex-1 p-2 border rounded"
              />
              {words.newTranslation && (
                <button
                  onClick={() => words.setNewTranslation('')}
                  className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
                  title="Wissen"
                >
                  ✕
                </button>
              )}
              <button
                onClick={() => words.generateAiTranslation(words.newWord, 'add')}
                disabled={words.aiTranslationLoading || !words.newWord.trim()}
                className="text-sm text-purple-600 hover:underline disabled:opacity-50 shrink-0"
              >
                {words.aiTranslationLoading ? 'Vertalen...' : 'AI vertaling'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
            {words.newExamples.map((ex, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <textarea
                  value={ex}
                  onChange={(e) => {
                    const updated = [...words.newExamples]
                    updated[i] = e.target.value
                    words.setNewExamples(updated)
                  }}
                  placeholder="Dutch sentence — English translation"
                  rows={2}
                  className="flex-1 p-2 border rounded text-sm resize-y"
                />
                <button
                  onClick={() => words.setNewExamples(words.newExamples.filter((_, j) => j !== i))}
                  className="text-red-500 hover:text-red-700 text-sm px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => words.setNewExamples([...words.newExamples, ''])}
              className="text-sm text-blue-600 hover:underline"
            >
              + Voorbeeld toevoegen
            </button>
            <button
              onClick={() => words.generateAiExamples(words.newWord, 'add')}
              disabled={words.aiExamplesLoading || !words.newWord.trim()}
              className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
            >
              {words.aiExamplesLoading ? 'Genereren...' : 'AI voorbeelden'}
            </button>
          </div>

          {words.addError && <p className="text-sm text-red-600">{words.addError}</p>}
          <button
            onClick={words.handleAddWord}
            disabled={words.addLoading || !words.newWord.trim() || !words.newTranslation.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {words.addLoading ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setSortAsc(a => !a)}
          title={sortAsc ? 'Oplopend' : 'Aflopend'}
          className="px-2 py-1 text-xs rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
        >
          {sortAsc ? '↑' : '↓'}
        </button>
      <div className="relative inline-block">
        <button
          onClick={() => setSortDropdownOpen(o => !o)}
          className="px-3 py-1 text-xs rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-100 flex items-center gap-1"
        >
          Sorteer op: {sortLabels[sortKey]} ▾
        </button>
        {sortDropdownOpen && (
          <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded shadow-md min-w-max">
            {(Object.keys(sortLabels) as SortKey[]).map(key => (
              <button
                key={key}
                onClick={() => { setSortKey(key); setPage(1); setSortDropdownOpen(false) }}
                className={[
                  'block w-full text-left px-4 py-2 text-xs hover:bg-gray-100',
                  sortKey === key ? 'font-semibold text-blue-600' : 'text-gray-700',
                ].join(' ')}
              >
                {sortLabels[key]}
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {words.wordsLoading && <p className="text-sm text-gray-400 italic">Laden...</p>}
      {words.wordsError && <p className="text-sm text-red-600">{words.wordsError}</p>}
      {!words.wordsLoading && !words.wordsError && words.words.length === 0 && (
        <p className="text-sm text-gray-400">Geen frasen gevonden.</p>
      )}

      <ul className="space-y-2">
        {pageWords.map(entry => (
          <li key={entry.id} className="border rounded p-3 bg-white">
            {words.editId === entry.id ? (
              <div className="space-y-3">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={words.editTranslation}
                      onChange={(e) => words.setEditTranslation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && words.handleEditWord()}
                      className="flex-1 p-2 border rounded"
                    />
                    <button
                      onClick={() => words.generateAiTranslation(words.editWord, 'edit')}
                      disabled={words.aiTranslationLoading || !words.editWord.trim()}
                      className="text-sm text-purple-600 hover:underline disabled:opacity-50 shrink-0"
                    >
                      {words.aiTranslationLoading ? 'Vertalen...' : 'AI vertaling'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
                  {words.editExamples.map((ex, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <textarea
                        value={ex}
                        onChange={(e) => {
                          const updated = [...words.editExamples]
                          updated[i] = e.target.value
                          words.setEditExamples(updated)
                        }}
                        placeholder="Dutch sentence — English translation"
                        rows={2}
                        className="flex-1 p-2 border rounded text-sm resize-y"
                      />
                      <button
                        onClick={() => words.setEditExamples(words.editExamples.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => words.setEditExamples([...words.editExamples, ''])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Voorbeeld toevoegen
                  </button>
                  <button
                    onClick={() => words.generateAiExamples(words.editWord, 'edit')}
                    disabled={words.aiExamplesLoading || !words.editWord.trim()}
                    className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
                  >
                    {words.aiExamplesLoading ? 'Genereren...' : 'AI voorbeelden'}
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  {words.isLoggedIn ? (
                    <button
                      onClick={words.handleEditWord}
                      disabled={words.editLoading || !words.editWord.trim() || !words.editTranslation.trim()}
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
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900">{entry.word}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => words.toggleExamples(entry.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {words.expandedWords.has(entry.id) ? '▼ Details' : '▶ Details'}
                    </button>
                    <button
                      onClick={() => words.onPractice(entry)}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      Oefenen
                    </button>
                    <button
                      onClick={() => words.startEdit(entry)}
                      className="text-gray-400 hover:text-blue-600 text-sm"
                      title="Bewerken"
                    >
                      ✎
                    </button>
                    {words.isLoggedIn && words.deleteConfirmId === entry.id ? (
                      <span className="flex items-center gap-1 text-xs">
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
                    ) : words.isLoggedIn ? (
                      <button
                        onClick={() => words.setDeleteConfirmId(entry.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                        title="Verwijderen"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
                {words.expandedWords.has(entry.id) && (
                  <div className="mt-2 space-y-2 border-t pt-2">
                    <div className="flex items-center gap-3">
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
                    <p className="text-sm text-gray-600 font-medium">{entry.translation}</p>
                    {entry.examples.length > 0 && (
                      <ul className="space-y-1 mt-1">
                        {entry.examples.map((ex, i) => (
                          <li key={i} className="text-sm text-gray-700 pl-2 border-l-2 border-blue-200">
                            {ex}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 text-sm border rounded ${p === safePage ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
