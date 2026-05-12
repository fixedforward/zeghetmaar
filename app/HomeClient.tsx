'use client'

import { useState, useEffect, useCallback } from 'react'

const DEFAULT_PROMPT = `When the user types a Dutch sentence or sentences:
1. Try to guess what it is trying to say in English and respond with: "Seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest an alternative Dutch sentence, if applicable`

// Tab type for the main sections
type Tab = 'herschrijver' | 'vertaler' | 'fraselijst'

interface WordEntry {
  id: string
  word: string
  translation: string
  examples: string[]
}

// Position and content for the selection popup
interface SelectionPopup {
  x: number
  y: number
  text: string
  explanation: string | null
  loading: boolean
}

export default function HomeClient() {
  // mounted is false on the server and on the initial client render, then flips
  // to true via useEffect. This ensures the server and client produce identical
  // output on first render (null), avoiding hydration mismatches.
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('fraselijst')

  // Herschrijver state
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCached, setIsCached] = useState(false)

  // Vertaler state
  const [englishInput, setEnglishInput] = useState('')
  const [translationResult, setTranslationResult] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  // Woordenlijst state
  const [words, setWords] = useState<WordEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  const [wordsLoaded, setWordsLoaded] = useState(false)
  // Tracks which word IDs have their examples expanded
  const [expandedWords, setExpandedWords] = useState<Set<string>>(new Set())

  // Add-word form state
  const [newWord, setNewWord] = useState('')
  const [newTranslation, setNewTranslation] = useState('')
  const [newExamples, setNewExamples] = useState<string[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editWord, setEditWord] = useState('')
  const [editTranslation, setEditTranslation] = useState('')
  const [editExamples, setEditExamples] = useState<string[]>([])
  const [editLoading, setEditLoading] = useState(false)

  // AI example generation
  const [aiExamplesLoading, setAiExamplesLoading] = useState(false)

  // Shared state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Popup shown when the user highlights text in the response area
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null)

  useEffect(() => {
    setMounted(true)
    loadWords()
  }, [])

  // All AI calls go through the Next.js /api/chat route handler (same origin).
  // No port discovery or cross-origin requests needed.
  const sendRequest = useCallback((text: string) => {
    setIsLoading(true)
    setResponse('')
    setIsCached(false)
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, prompt: DEFAULT_PROMPT, model: '' })
    })
      .then(res => res.json())
      .then(data => {
        setResponse(data.response || data.error || 'Error occurred')
        setIsCached(data.cached || false)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('[sendRequest] Failed to reach /api/chat —', err instanceof Error ? err.message : err)
        setResponse('Could not reach the server. Please try again.')
        setIsLoading(false)
      })
  }, [])

  const handleSubmit = () => {
    if (!input.trim()) return
    sendRequest(input)
  }

  const handleRefresh = () => {
    if (!input.trim() || isLoading) return
    sendRequest(input)
  }

  const capitalizeFirstLetter = (str: string) =>
    str.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

  const handleInputChange = (value: string) => {
    setInput(capitalizeFirstLetter(value))
  }

  const handleTranslate = () => {
    if (!englishInput.trim() || isTranslating) return
    setIsTranslating(true)
    setTranslationResult('')
    const translatePrompt = 'Give 2 or 3 different natural ways to say the following English sentence in Dutch. Number each option and briefly note any difference in tone or formality if relevant. Reply only with the Dutch options, no extra explanation.'
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: englishInput, prompt: translatePrompt, model: '' })
    })
      .then(res => res.json())
      .then(data => {
        setTranslationResult(data.response || data.error || 'Er is een fout opgetreden')
        setIsTranslating(false)
      })
      .catch(() => {
        console.error('[handleTranslate] Failed to reach /api/chat')
        setTranslationResult('Could not reach the server. Please try again.')
        setIsTranslating(false)
      })
  }

  // Called when the user releases the mouse after selecting text inside the
  // response box. Positions the popup at the cursor and fires an AI request
  // to explain the highlighted word or phrase.
  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    const selected = window.getSelection()?.toString().trim()
    if (!selected) {
      setSelectionPopup(null)
      return
    }

    setSelectionPopup({ x: e.clientX, y: e.clientY + 12, text: selected, explanation: null, loading: true })

    const explainPrompt = 'The user is learning Dutch. They highlighted the following word or phrase and want to know what it means. Give a short, clear explanation in English: what it means, and (if it is Dutch) how it is typically used. Keep it to 2-3 sentences max.'
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selected, prompt: explainPrompt, model: '' })
    })
      .then(res => res.json())
      .then(data => {
        setSelectionPopup(prev => prev ? { ...prev, explanation: data.response || data.error || 'Geen uitleg gevonden', loading: false } : null)
      })
      .catch(() => {
        console.error('[handleTextSelection] Failed to reach /api/chat')
        setSelectionPopup(prev => prev ? { ...prev, explanation: 'Could not reach the server. Please try again.', loading: false } : null)
      })
  }, [])

  // Fetch the word list from the API route.
  const loadWords = useCallback((force = false) => {
    if ((!force && wordsLoaded) || wordsLoading) return
    setWordsLoading(true)
    setWordsError(null)
    fetch('/api/words')
      .then(res => {
        if (!res.ok) throw new Error('Kon de fraselijst niet laden')
        return res.json()
      })
      .then((data: WordEntry[]) => {
        setWords(data)
        setWordsLoaded(true)
        setWordsLoading(false)
      })
      .catch((err: Error) => {
        setWordsError(err.message)
        setWordsLoading(false)
      })
  }, [wordsLoaded, wordsLoading])

  const handleAddWord = () => {
    if (!newWord.trim() || !newTranslation.trim()) return
    setAddLoading(true)
    setAddError(null)
    fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord, translation: newTranslation, examples: newExamples.filter(e => e.trim()) }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet toevoegen')
        setNewWord('')
        setNewTranslation('')
        setNewExamples([])
        setShowAddForm(false)
        loadWords(true)
      })
      .catch((err: Error) => setAddError(err.message))
      .finally(() => setAddLoading(false))
  }

  const handleDeleteWord = (id: string) => {
    setDeleteLoading(true)
    fetch('/api/words', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet verwijderen')
        setDeleteConfirmId(null)
        loadWords(true)
      })
      .catch((err: Error) => {
        console.error('[handleDeleteWord]', err.message)
        setDeleteConfirmId(null)
      })
      .finally(() => setDeleteLoading(false))
  }

  const startEdit = (entry: WordEntry) => {
    setEditId(entry.id)
    setEditWord(entry.word)
    setEditTranslation(entry.translation)
    setEditExamples([...entry.examples])
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditWord('')
    setEditTranslation('')
    setEditExamples([])
  }

  const generateAiExamples = (word: string, target: 'add' | 'edit') => {
    if (!word.trim()) return
    setAiExamplesLoading(true)
    const prompt = `Generate 3 natural Dutch example sentences using the word or phrase "${word}". For each sentence, provide the Dutch sentence followed by " — " (space em-dash space) and the English translation. Return ONLY the sentences, one per line, no numbering, no extra text.`
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: word, prompt, model: '' }),
    })
      .then(res => res.json())
      .then(data => {
        const lines = (data.response || '').split('\n').map((l: string) => l.trim()).filter(Boolean)
        if (target === 'add') {
          setNewExamples(prev => [...prev, ...lines])
        } else {
          setEditExamples(prev => [...prev, ...lines])
        }
      })
      .catch(err => console.error('[generateAiExamples]', err))
      .finally(() => setAiExamplesLoading(false))
  }

  const handleEditWord = () => {
    if (!editId || !editWord.trim() || !editTranslation.trim()) return
    setEditLoading(true)
    fetch('/api/words', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editId, word: editWord, translation: editTranslation, examples: editExamples.filter(e => e.trim()) }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Kon woord niet bijwerken')
        cancelEdit()
        loadWords(true)
      })
      .catch((err: Error) => console.error('[handleEditWord]', err.message))
      .finally(() => setEditLoading(false))
  }

  const toggleExamples = (id: string) => {
    setExpandedWords(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Render nothing until mounted on the client. This matches the server output
  // (null) exactly, preventing any hydration mismatch.
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
              onClick={() => { setActiveTab('fraselijst'); loadWords() }}
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
          </nav>
        )}
      </aside>

      <main className="flex-1 p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Nederlandse Herschrijver</h1>
        </div>

        {/* Tab bar */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => { setActiveTab('fraselijst'); loadWords() }}
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
        </div>

        {/* Fraselijst tab */}
        {activeTab === 'fraselijst' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">
                Opgeslagen woorden en zinnen met vertaling en voorbeeldgebruik.
              </p>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
              >
                {showAddForm ? '✕ Sluiten' : '+ Woord toevoegen'}
              </button>
            </div>

            {/* Add word form */}
            {showAddForm && (
              <div className="border rounded p-4 bg-gray-50 mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Woord</label>
                  <input
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="bijv. gezellig"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
                  <input
                    type="text"
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="bijv. cozy, pleasant"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
                  {newExamples.map((ex, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ex}
                        onChange={(e) => {
                          const updated = [...newExamples]
                          updated[i] = e.target.value
                          setNewExamples(updated)
                        }}
                        placeholder="Dutch sentence — English translation"
                        className="flex-1 p-2 border rounded text-sm"
                      />
                      <button
                        onClick={() => setNewExamples(newExamples.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewExamples([...newExamples, ''])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Voorbeeld toevoegen
                  </button>
                  <button
                    onClick={() => generateAiExamples(newWord, 'add')}
                    disabled={aiExamplesLoading || !newWord.trim()}
                    className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
                  >
                    {aiExamplesLoading ? '✨ Genereren...' : '✨ AI voorbeelden'}
                  </button>
                </div>
                {addError && <p className="text-sm text-red-600">{addError}</p>}
                <button
                  onClick={handleAddWord}
                  disabled={addLoading || !newWord.trim() || !newTranslation.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {addLoading ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>
            )}

            {wordsLoading && <p className="text-sm text-gray-400 italic">Laden...</p>}
            {wordsError && <p className="text-sm text-red-600">{wordsError}</p>}
            {!wordsLoading && !wordsError && words.length === 0 && (
              <p className="text-sm text-gray-400">Geen woorden gevonden.</p>
            )}

            <ul className="space-y-2">
              {words.map(entry => (
                <li key={entry.id} className="border rounded p-3 bg-white">
                  {editId === entry.id ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Woord</label>
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vertaling</label>
                        <input
                          type="text"
                          value={editTranslation}
                          onChange={(e) => setEditTranslation(e.target.value)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Voorbeeldzinnen</label>
                        {editExamples.map((ex, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={ex}
                              onChange={(e) => {
                                const updated = [...editExamples]
                                updated[i] = e.target.value
                                setEditExamples(updated)
                              }}
                              placeholder="Dutch sentence — English translation"
                              className="flex-1 p-2 border rounded text-sm"
                            />
                            <button
                              onClick={() => setEditExamples(editExamples.filter((_, j) => j !== i))}
                              className="text-red-500 hover:text-red-700 text-sm px-2"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => setEditExamples([...editExamples, ''])}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          + Voorbeeld toevoegen
                        </button>
                        <button
                          onClick={() => generateAiExamples(editWord, 'edit')}
                          disabled={aiExamplesLoading || !editWord.trim()}
                          className="text-sm text-purple-600 hover:underline ml-4 disabled:opacity-50"
                        >
                          {aiExamplesLoading ? '✨ Genereren...' : '✨ AI voorbeelden'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditWord}
                          disabled={editLoading || !editWord.trim() || !editTranslation.trim()}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                        >
                          {editLoading ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                          onClick={cancelEdit}
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
                          <span className="text-gray-500 text-sm ml-3">{entry.translation}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {entry.examples.length > 0 && (
                            <button
                              onClick={() => toggleExamples(entry.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {expandedWords.has(entry.id) ? '▼ Voorbeelden' : '▶ Voorbeelden'}
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(entry)}
                            className="text-gray-400 hover:text-blue-600 text-sm"
                            title="Bewerken"
                          >
                            ✎
                          </button>
                          {deleteConfirmId === entry.id ? (
                            <span className="flex items-center gap-1 text-xs">
                              <span className="text-gray-600">Verwijderen?</span>
                              <button
                                onClick={() => handleDeleteWord(entry.id)}
                                disabled={deleteLoading}
                                className="text-red-600 hover:underline font-medium"
                              >
                                Ja
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-gray-500 hover:underline"
                              >
                                Nee
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(entry.id)}
                              className="text-red-400 hover:text-red-600 text-sm"
                              title="Verwijderen"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {expandedWords.has(entry.id) && (
                        <ul className="mt-2 space-y-1 border-t pt-2">
                          {entry.examples.map((ex, i) => (
                            <li key={i} className="text-sm text-gray-700 pl-2 border-l-2 border-blue-200">
                              {ex}
                            </li>
                          ))}
                        </ul>
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
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Type Dutch sentence..."
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Verzenden...' : 'Verzenden'}
              </button>
            </div>

            <div className="text-xs text-gray-500 mb-4">Druk op Enter om te verzenden</div>

            <div className="border rounded p-3 bg-white mb-4 min-h-[100px]" onMouseUp={handleTextSelection}>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-gray-500">Engels:</div>
                {response && (
                  <div className="flex items-center gap-2">
                    {isCached && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Cached</span>
                    )}
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      ↻ Refresh
                    </button>
                  </div>
                )}
              </div>
              <div className="text-gray-800 whitespace-pre-wrap">
                {response}
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
                value={englishInput}
                onChange={(e) => setEnglishInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                placeholder="Type an English sentence..."
                className="flex-1 p-2 border rounded"
              />
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !englishInput.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isTranslating ? 'Vertalen...' : 'Vertaal'}
              </button>
            </div>
            {translationResult && (
              <div className="p-3 bg-gray-50 border rounded text-sm whitespace-pre-wrap text-gray-800">
                {translationResult}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Selection explanation popup — rendered outside main to allow fixed positioning */}
      {selectionPopup && (
        <div
          data-selection-popup
          className="fixed z-50 max-w-xs bg-white border border-gray-200 rounded shadow-lg p-3 text-sm"
          style={{ left: Math.min(selectionPopup.x, window.innerWidth - 320), top: selectionPopup.y }}
        >
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="font-medium text-gray-700 truncate">"{selectionPopup.text}"</span>
            <button
              onClick={() => setSelectionPopup(null)}
              className="text-gray-400 hover:text-gray-600 shrink-0 leading-none"
            >
              ✕
            </button>
          </div>
          {selectionPopup.loading
            ? <span className="text-gray-400 italic">Laden...</span>
            : <p className="text-gray-800 whitespace-pre-wrap">{selectionPopup.explanation}</p>
          }
        </div>
      )}
    </div>
  )
}
