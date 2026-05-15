import type { useWords } from '../hooks/useWords'

type Props = ReturnType<typeof useWords>

export function FraselijstTab(words: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          Opgeslagen woorden en zinnen met vertaling en voorbeeldgebruik.
        </p>
        <button
          onClick={() => words.setShowAddForm(!words.showAddForm)}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
        >
          {words.showAddForm ? '✕ Sluiten' : '+ Woord toevoegen'}
        </button>
      </div>

      {words.showAddForm && (
        <div className="border rounded p-4 bg-gray-50 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Woord</label>
            <input
              type="text"
              value={words.newWord}
              onChange={(e) => words.setNewWord(e.target.value)}
              placeholder="bijv. gezellig"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
            <input
              type="text"
              value={words.newTranslation}
              onChange={(e) => words.setNewTranslation(e.target.value)}
              placeholder="bijv. cozy, pleasant"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
            {words.newExamples.map((ex, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={ex}
                  onChange={(e) => {
                    const updated = [...words.newExamples]
                    updated[i] = e.target.value
                    words.setNewExamples(updated)
                  }}
                  placeholder="Dutch sentence — English translation"
                  className="flex-1 p-2 border rounded text-sm"
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
              {words.aiExamplesLoading ? '✨ Genereren...' : '✨ AI voorbeelden'}
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

      {words.wordsLoading && <p className="text-sm text-gray-400 italic">Laden...</p>}
      {words.wordsError && <p className="text-sm text-red-600">{words.wordsError}</p>}
      {!words.wordsLoading && !words.wordsError && words.words.length === 0 && (
        <p className="text-sm text-gray-400">Geen woorden gevonden.</p>
      )}

      <ul className="space-y-2">
        {words.words.map(entry => (
          <li key={entry.id} className="border rounded p-3 bg-white">
            {words.editId === entry.id ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Woord</label>
                  <input
                    type="text"
                    value={words.editWord}
                    onChange={(e) => words.setEditWord(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
                  <input
                    type="text"
                    value={words.editTranslation}
                    onChange={(e) => words.setEditTranslation(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
                  {words.editExamples.map((ex, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => {
                          const updated = [...words.editExamples]
                          updated[i] = e.target.value
                          words.setEditExamples(updated)
                        }}
                        placeholder="Dutch sentence — English translation"
                        className="flex-1 p-2 border rounded text-sm"
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
                    {words.aiExamplesLoading ? '✨ Genereren...' : '✨ AI voorbeelden'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={words.handleEditWord}
                    disabled={words.editLoading || !words.editWord.trim() || !words.editTranslation.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                  >
                    {words.editLoading ? 'Opslaan...' : 'Opslaan'}
                  </button>
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
                  <span className="font-semibold text-gray-900">{entry.word}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => words.toggleExamples(entry.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {words.expandedWords.has(entry.id) ? '▼ Details' : '▶ Details'}
                    </button>
                    <button
                      onClick={() => words.startEdit(entry)}
                      className="text-gray-400 hover:text-blue-600 text-sm"
                      title="Bewerken"
                    >
                      ✎
                    </button>
                    {words.deleteConfirmId === entry.id ? (
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
                    ) : (
                      <button
                        onClick={() => words.setDeleteConfirmId(entry.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                        title="Verwijderen"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {words.expandedWords.has(entry.id) && (
                  <div className="mt-2 space-y-1 border-t pt-2">
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
    </div>
  )
}
