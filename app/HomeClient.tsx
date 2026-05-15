'use client'

import { useState, useEffect } from 'react'
import type { Tab } from './types'
import { MODELS } from './config/models'
import { useModelSelection } from './hooks/useModelSelection'
import { useExercises } from './hooks/useExercises'
import { useWords } from './hooks/useWords'
import { useAiChat } from './hooks/useAiChat'

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('fraselijst')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const { selectedModel, setModel } = useModelSelection()
  const exercises = useExercises()
  const words = useWords(selectedModel)
  const chat = useAiChat(selectedModel)

  useEffect(() => {
    setMounted(true)
    words.loadWords()
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen flex">
      <aside className={`bg-gray-100 border-r transition-all duration-200 ${sidebarCollapsed ? 'w-12' : 'w-48'} p-2`}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full text-left px-2 py-1 mb-2 text-sm hover:bg-gray-200 rounded"
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
        {!sidebarCollapsed && (
          <nav className="space-y-2">
            <button
              onClick={() => { setActiveTab('fraselijst'); words.loadWords() }}
              className={`w-full text-left block px-3 py-2 rounded ${activeTab === 'fraselijst' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Fraselijst
            </button>
            <button
              onClick={() => setActiveTab('herschrijver')}
              className={`w-full text-left block px-3 py-2 rounded ${activeTab === 'herschrijver' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Herschrijver
            </button>
            <button
              onClick={() => setActiveTab('vertaler')}
              className={`w-full text-left block px-3 py-2 rounded ${activeTab === 'vertaler' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Vertaler
            </button>
            <button
              onClick={() => setActiveTab('oefeningen')}
              className={`w-full text-left block px-3 py-2 rounded ${activeTab === 'oefeningen' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Extra Oefeningen
            </button>
          </nav>
        )}
      </aside>

      <main className="flex-1 p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Nederlands Oefenen</h1>
          <select
            value={selectedModel}
            onChange={e => setModel(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white text-gray-700"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Tab bar */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => { setActiveTab('fraselijst'); words.loadWords() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fraselijst' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Fraselijst
          </button>
          <button
            onClick={() => setActiveTab('herschrijver')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'herschrijver' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Herschrijver
          </button>
          <button
            onClick={() => setActiveTab('vertaler')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vertaler' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Engels → Nederlands
          </button>
          <button
            onClick={() => setActiveTab('oefeningen')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'oefeningen' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Extra Oefeningen
          </button>
        </div>

        {/* Fraselijst tab */}
        {activeTab === 'fraselijst' && (
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

            {/* Add word form */}
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
                    /* Edit mode */
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
                    /* View mode */
                    <>
                      <div className="flex justify-between items-start gap-4">
                        <div>
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
        )}

        {/* Herschrijver tab */}
        {activeTab === 'herschrijver' && (
          <>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={chat.input}
                onChange={(e) => chat.handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && chat.handleSubmit()}
                placeholder="Type Dutch sentence..."
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={chat.handleSubmit}
                disabled={chat.isLoading || !chat.input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {chat.isLoading ? 'Verzenden...' : 'Verzenden'}
              </button>
            </div>

            <div className="text-xs text-gray-500 mb-4">Druk op Enter om te verzenden</div>

            <div className="border rounded p-3 bg-white mb-4 min-h-[100px]" onMouseUp={chat.handleTextSelection}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-gray-500">Engels:</div>
                {chat.response && (
                  <div className="flex items-center gap-2">
                    {chat.isCached && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Cached</span>
                    )}
                    <button
                      onClick={chat.handleRefresh}
                      disabled={chat.isLoading}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                )}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">
                {chat.response}
              </div>
            </div>
          </>
        )}

        {/* Vertaler tab */}
        {activeTab === 'vertaler' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Typ een Engelse zin en krijg 2 of 3 manieren om het in het Nederlands te zeggen.</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={chat.englishInput}
                onChange={(e) => chat.setEnglishInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && chat.handleTranslate()}
                placeholder="Type an English sentence..."
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={chat.handleTranslate}
                disabled={chat.isTranslating || !chat.englishInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {chat.isTranslating ? 'Vertalen...' : 'Vertaal'}
              </button>
            </div>
            {chat.translationResult && (
              <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-wrap text-gray-800">
                {chat.translationResult}
              </div>
            )}
          </div>
        )}

        {/* Extra Oefeningen tab */}
        {activeTab === 'oefeningen' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">Handige links naar extra oefeningen om je Nederlands te verbeteren.</p>
              <button
                onClick={() => exercises.setShowAddExercise(!exercises.showAddExercise)}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
              >
                {exercises.showAddExercise ? 'Annuleren' : '+ Toevoegen'}
              </button>
            </div>

            {exercises.showAddExercise && (
              <div className="mb-4 p-3 border rounded bg-gray-50 space-y-2">
                <input
                  type="text"
                  value={exercises.newExerciseName}
                  onChange={(e) => exercises.setNewExerciseName(e.target.value)}
                  placeholder="Naam van de oefening"
                  className="w-full p-2 border rounded"
                />
                <input
                  type="url"
                  value={exercises.newExerciseUrl}
                  onChange={(e) => exercises.setNewExerciseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={exercises.handleAddExercise}
                  disabled={!exercises.newExerciseName.trim() || !exercises.newExerciseUrl.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                  Opslaan
                </button>
              </div>
            )}

            {exercises.exercises.length === 0 && <p className="text-sm text-gray-400">Geen oefeningen. Voeg er een toe!</p>}

            <ul className="space-y-2">
              {exercises.exercises.map((exercise) => (
                <li key={exercise.id} className="border rounded p-3 bg-white">
                  {exercises.editExerciseId === exercise.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={exercises.editExerciseName}
                        onChange={(e) => exercises.setEditExerciseName(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                      <input
                        type="url"
                        value={exercises.editExerciseUrl}
                        onChange={(e) => exercises.setEditExerciseUrl(e.target.value)}
                        className="w-full p-2 border rounded"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={exercises.handleEditExercise}
                          disabled={!exercises.editExerciseName.trim() || !exercises.editExerciseUrl.trim()}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={() => exercises.setEditExerciseId(null)}
                          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <a
                        href={exercise.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        {exercise.name}
                      </a>
                      <div className="flex gap-2">
                        {exercises.deleteExerciseConfirmId === exercise.id ? (
                          <>
                            <button
                              onClick={() => exercises.handleDeleteExercise(exercise.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Bevestigen
                            </button>
                            <button
                              onClick={() => exercises.setDeleteExerciseConfirmId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                              Annuleren
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => exercises.startEditExercise(exercise)}
                              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            >
                              Bewerken
                            </button>
                            <button
                              onClick={() => exercises.setDeleteExerciseConfirmId(exercise.id)}
                              className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                            >
                              Verwijderen
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Selection explanation popup — rendered outside main to allow fixed positioning */}
      {chat.selectionPopup && (
        <div
          data-selection-popup
          className="fixed z-50 max-w-xs bg-white border border-gray-200 rounded shadow-lg p-3 text-sm"
          style={{ left: Math.min(chat.selectionPopup.x, window.innerWidth - 320), top: chat.selectionPopup.y }}
        >
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="font-medium text-gray-700 truncate">"{chat.selectionPopup.text}"</span>
            <button
              onClick={() => chat.setSelectionPopup(null)}
              className="text-gray-400 hover:text-gray-600 shrink-0 leading-none"
            >
              ✕
            </button>
          </div>
          {chat.selectionPopup.loading
            ? <span className="text-gray-400 italic">Laden...</span>
            : <p className="text-gray-800 whitespace-pre-wrap">{chat.selectionPopup.explanation}</p>
          }
        </div>
      )}
    </div>
  )
}
