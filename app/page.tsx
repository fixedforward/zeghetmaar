'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_PROMPT = `When the user types a Dutch sentence:
1. Try to guess what the sentence is trying to say in English and respond with: "It seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest an alternative, if applicable`

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const REAL_TIME_FEATURE_ENABLED = false

const WS_URL = typeof window !== 'undefined' ? `ws://${window.location.hostname}:8080` : ''

export default function Home() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRealTime, setIsRealTime] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [promptOverride, setPromptOverride] = useState('')
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [modelOverride, setModelOverride] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendConnected, setBackendConnected] = useState(true)
  const [isCached, setIsCached] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const savedPrompt = localStorage.getItem('promptOverride')
    if (savedPrompt) {
      setPromptOverride(savedPrompt)
    }

    const savedModel = localStorage.getItem('modelOverride')
    if (savedModel) {
      setModelOverride(savedModel)
    }

    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'ping', prompt: 'ping' })
        })
        setBackendConnected(res.ok)
      } catch {
        setBackendConnected(false)
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 5000)
    
    return () => {
      clearInterval(interval)
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
    
    const ws = new WebSocket(WS_URL)
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
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text,
        prompt: effectivePrompt,
        model: effectiveModel
      }))
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

  const handleRefresh = () => {
    if (!input.trim() || isLoading) return
    sendRequest(input, false)
  }

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

  const capitalizeFirstLetter = (str: string) => {
    return str.replace(/(^|[.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())
  }

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
            <a href="/" className="block px-3 py-2 rounded bg-blue-500 text-white">
              Tutor
            </a>
          </nav>
        )}
      </aside>
      
      <main className="flex-1 p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Nederlandse Tutor</h1>
        {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>
      
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
        <div className="text-xs text-gray-500 mb-4">
          Druk op Enter om te verzenden
        </div>
      )}
      
      <div className="border rounded p-3 bg-white mb-4 min-h-[100px]">
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm text-gray-500">Engels:</div>
          {response && (
            <div className="flex items-center gap-2">
              {isCached && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  Cached
                </span>
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
      
      {!backendConnected && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Backend disconnected. Please ensure the server is running on port 8080.
        </div>
      )}
      
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
    </main>
    </div>
  )
}