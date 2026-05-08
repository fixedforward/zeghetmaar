'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_PROMPT = `When the user types a Dutch sentence or sentences:
1. Try to guess what it is trying to say in English and respond with: "Seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest an alternative Dutch sentence, if applicable`

const REAL_TIME_FEATURE_ENABLED = false

// WS_URL is derived at connection time (inside useEffect/callbacks) to avoid
// accessing window during SSR, which would cause a hydration mismatch.
const getWsUrl = () => `ws://${window.location.hostname}:8080`

// Tab type for the two main sections
type Tab = 'herschrijver' | 'vertaler' | 'woordenlijst'

// Shape of each entry in public/woordenlijst.json
interface WordEntry {
  id: number
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
  const [activeTab, setActiveTab] = useState<Tab>('herschrijver')

  // Herschrijver state
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRealTime, setIsRealTime] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [promptOverride, setPromptOverride] = useState('')
  const [model, setModel] = useState('')
  const [modelOverride, setModelOverride] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Vertaler state
  const [englishInput, setEnglishInput] = useState('')
  const [translationResult, setTranslationResult] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)

  // Woordenlijst state
  const [words, setWords] = useState<WordEntry[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [wordsError, setWordsError] = useState<string | null>(null)
  // Tracks which word IDs have their examples expanded
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set())

  // Shared state
  const [backendConnected, setBackendConnected] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Popup shown when the user highlights text in the response area
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopup | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)

    const savedPrompt = localStorage.getItem('promptOverride')
    if (savedPrompt) setPromptOverride(savedPrompt)

    const savedModel = localStorage.getItem('modelOverride')
    if (savedModel) setModelOverride(savedModel)

    const checkBackend = async () => {
      try {
        const [chatRes, configRes] = await Promise.all([
          fetch('http://localhost:8080/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'ping', prompt: 'ping' })
          }),
          fetch('http://localhost:8080/api/config')
        ])
        setBackendConnected(chatRes.ok)
        const configData = await configRes.json()
        if (configData.model) setModel(configData.model)
      } catch {
        setBackendConnected(false)
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 5000)

    // Close the selection popup when the user clicks anywhere outside it
    const handleMouseDown = (e: MouseEvent) => {
      const popup = document.querySelector('[data-selection-popup]')
      if (popup && !popup.contains(e.target as Node)) {
        setSelectionPopup(null)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      clearInterval(interval)
      document.removeEventListener('mousedown', handleMouseDown)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const getEffectivePrompt = useCallback(() => {
    return promptOverride || prompt
  }, [prompt, promptOverride])

  const getEffectiveModel = useCallback(() => {
    return modelOverride || model
  }, [model, modelOverride])

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const ws = new WebSocket(getWsUrl())
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'chunk') {
        setResponse(prev => prev + data.content)
      } else if (data.type === 'done') {
        setIsStreaming(false)
      }
    }
    wsRef.current = ws
  }, [])

  const sendRequest = useCallback((text: string, isStreamingMode = false) => {
    const effectivePrompt = getEffectivePrompt()
    const effectiveModel = getEffectiveModel()

    if (isStreamingMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text, prompt: effectivePrompt, model: effectiveModel }))
    } else {
      setIsLoading(true)
      setResponse('')
      setIsCached(false)
      fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt: effectivePrompt, model: effectiveModel })
      })
        .then(res => res.json())
        .then(data => {
          setResponse(data.response || data.error || 'Error occurred')
          setIsCached(data.cached || false)
          setIsLoading(false)
        })
        .catch(err => {
          console.error(err)
          setIsLoading(false)
        })
    }
  }, [getEffectivePrompt, getEffectiveModel])

  const handleSubmit = () => {
    if (!input.trim()) return
    setResponse('')
    setIsStreaming(isRealTime)
    if (isRealTime) {
      connectWS()
      setTimeout(() => sendRequest(input, true), 100)
    } else {
      sendRequest(input, false)
    }
  }

  const capitalizeFirstLetter = (str: string) =>
    str.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

  const handleInputChange = (value: string) => {
    const capitalized = capitalizeFirstLetter(value)
    setInput(capitalized)
    if (isRealTime && capitalized.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setResponse('')
        setIsStreaming(true)
        connectWS()
        setTimeout(() => sendRequest(capitalized, true), 100)
      }, 500)
    }
  }

  const handleRefresh = () => {
    if (!input.trim() || isLoading) return
    sendRequest(input, false)
  }

  const handleTranslate = () => {
    if (!englishInput.trim() || isTranslating) return
    setIsTranslating(true)
    setTranslationResult('')
    const translatePrompt = 'Give 2 or 3 different natural ways to say the following English sentence in Dutch. Number each option and briefly note any difference in tone or formality if relevant. Reply only with the Dutch options, no extra explanation.'
    fetch('http://localhost:8080/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: englishInput, prompt: translatePrompt, model: getEffectiveModel() })
    })
      .then(res => res.json())
      .then(data => {
        setTranslationResult(data.response || data.error || 'Er is een fout opgetreden')
        setIsTranslating(false)
      })
      .catch(() => {
        setTranslationResult('Er is een fout opgetreden')
        setIsTranslating(false)
      })
  }

  // Called when the user releases the mouse after selecting text inside the
  // response box. Positions the popup at the end of the selection and fires
  // an AI request to explain the highlighted word or phrase.
  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    const selected = window.getSelection()?.toString().trim()
    if (!selected) {
      setSelectionPopup(null)
      return
    }

    // Position the popup just below the mouse cursor
    const popup: SelectionPopup = {
      x: e.clientX,
      y: e.clientY + 12,
      text: selected,
      explanation: null,
      loading: true,
    }
    setSelectionPopup(popup)

    const explainPrompt = 'The user is learning Dutch. They highlighted the following word or phrase and want to know what it means. Give a short, clear explanation in English: what it means, and (if it is Dutch) how it is typically used. Keep it to 2-3 sentences max.'
    fetch('http://localhost:8080/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: selected, prompt: explainPrompt, model: getEffectiveModel() })
    })
      .then(res => res.json())
      .then(data => {
        setSelectionPopup(prev => prev ? { ...prev, explanation: data.response || data.error || 'Geen uitleg gevonden', loading: false } : null)
      })
      .catch(() => {
        setSelectionPopup(prev => prev ? { ...prev, explanation: 'Er is een fout opgetreden', loading: false } : null)
      })
  }, [getEffectiveModel])

  // Fetch the word list from the static JSON file the first time the tab is opened.
  // We check words.length so it only loads once per session.
  const loadWords = useCallback(() => {
    if (words.length > 0 || wordsLoading) return
    setWordsLoading(true)
    setWordsError(null)
    fetch('/woordenlijst.json')
      .then(res => {
        if (!res.ok) throw new Error('Kon de woordenlijst niet laden')
        return res.json()
      })
      .then((data: WordEntry[]) => {
        setWords(data)
        setWordsLoading(false)
      })
      .catch((err: Error) => {
        setWordsError(err.message)
        setWordsLoading(false)
      })
  }, [words.length, wordsLoading])

  const toggleExamples = (id: number) => {
    setExpandedWords(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Render nothing until mounted on the client. This matches the server output
  // (null) exactly, preventing any hydration mismatch.
  if (!mounted) return null

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

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
              onClick={() => { setActiveTab('woordenlijst'); loadWords() }}
              className={`w-full text-left block px-3 py-2 rounded ${activeTab === 'woordenlijst' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
            >
              Woordenlijst
            </button>
          </nav>
        )}
      </aside>

      <main className="flex-1 p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Nederlandse Herschrijver</h1>
          {isLocalhost && (
            <button
              onClick={() => {
                fetch('http://localhost:8080/api/restart', { method: 'POST' })
                setBackendConnected(false)
                setTimeout(() => window.location.reload(), 2000)
              }}
              className="text-sm px-3 py-1 border rounded hover:bg-gray-100"
            >
              Restart Server
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('herschrijver')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'herschrijver' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Herschrijver
          </button>
          <button
            onClick={() => { setActiveTab('vertaler') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vertaler' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Engels → Nederlands
          </button>
          <button
            onClick={() => { setActiveTab('woordenlijst'); loadWords() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'woordenlijst' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Woordenlijst
          </button>
        </div>

        {!backendConnected && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Backend disconnected. Please ensure the server is running on port 8080.
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
                onKeyDown={(e) => e.key === 'Enter' && !isRealTime && handleSubmit()}
                placeholder="Type Dutch sentence..."
                className="flex-1 p-2 border rounded"
                disabled={isRealTime}
              />
              <button
                onClick={handleSubmit}
                disabled={isRealTime || isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Verzenden...' : 'Verzenden'}
              </button>
            </div>

            {!isRealTime && (
              <div className="text-xs text-gray-500 mb-4">Druk op Enter om te verzenden</div>
            )}

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
                {response || (isStreaming ? '...' : '')}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              {REAL_TIME_FEATURE_ENABLED && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRealTime}
                    onChange={(e) => setIsRealTime(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Real-time
                </label>
              )}
            </div>

            <div className="mb-4 border rounded p-3">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {settingsOpen ? '▼' : '▶'} Instellingen
              </button>

              {settingsOpen && (
                <div className="mt-3">
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-1">Model:</label>
                    <input
                      type="text"
                      value={modelOverride || model}
                      onChange={(e) => setModelOverride(e.target.value)}
                      onBlur={() => {
                        if (modelOverride) localStorage.setItem('modelOverride', modelOverride)
                      }}
                      className="w-full p-2 border rounded text-sm"
                      placeholder="Model name"
                    />
                    {modelOverride && (
                      <button
                        onClick={() => {
                          setModelOverride('')
                          localStorage.removeItem('modelOverride')
                        }}
                        className="text-xs text-red-500 mt-1 hover:underline"
                      >
                        Reset naar standaard
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-gray-100 rounded">
                    <span className="text-sm font-medium block mb-2">System Prompt</span>
                    <textarea
                      value={promptOverride || prompt}
                      onChange={(e) => setPromptOverride(e.target.value)}
                      onBlur={() => {
                        if (promptOverride) localStorage.setItem('promptOverride', promptOverride)
                      }}
                      className="w-full p-2 border rounded text-sm font-mono"
                      rows={4}
                      placeholder="Enter system prompt..."
                    />
                  </div>
                </div>
              )}
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

        {/* Woordenlijst tab — data is loaded from public/woordenlijst.json */}
        {activeTab === 'woordenlijst' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Opgeslagen woorden en zinnen met vertaling en voorbeeldgebruik.
              Pas <code className="bg-gray-100 px-1 rounded">public/woordenlijst.json</code> aan om woorden toe te voegen.
            </p>

            {wordsLoading && (
              <p className="text-sm text-gray-400 italic">Laden...</p>
            )}

            {wordsError && (
              <p className="text-sm text-red-600">{wordsError}</p>
            )}

            {!wordsLoading && !wordsError && words.length === 0 && (
              <p className="text-sm text-gray-400">Geen woorden gevonden in woordenlijst.json.</p>
            )}

            <ul className="space-y-2">
              {words.map(entry => (
                <li key={entry.id} className="border rounded p-3 bg-white">
                  {/* Word and translation row */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="font-semibold text-gray-900">{entry.word}</span>
                      <span className="text-gray-500 text-sm ml-3">{entry.translation}</span>
                    </div>
                    {/* Toggle examples button — only shown if examples exist */}
                    {entry.examples.length > 0 && (
                      <button
                        onClick={() => toggleExamples(entry.id)}
                        className="text-xs text-blue-600 hover:underline shrink-0"
                      >
                        {expandedWords.has(entry.id) ? '▼ Voorbeelden' : '▶ Voorbeelden'}
                      </button>
                    )}
                  </div>

                  {/* Collapsible examples section */}
                  {expandedWords.has(entry.id) && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {entry.examples.map((ex, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-2 border-l-2 border-blue-200">
                          {ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
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
