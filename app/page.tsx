'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DEFAULT_PROMPT = `When the user types a Dutch sentence:
1. Provide the English translation with format: "It seems you are trying to say: [translation]"
2. Explain what was wrong or not optimal (if anything), max 2 short sentences
3. Suggest a better way to say it (if applicable), max 2 short sentences`

const WS_URL = typeof window !== 'undefined' ? `ws://${window.location.hostname}:8080` : ''

export default function Home() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isRealTime, setIsRealTime] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [showPrompt, setShowPrompt] = useState(true)
  const [promptOverride, setPromptOverride] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendConnected, setBackendConnected] = useState(true)
  
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const savedPrompt = localStorage.getItem('promptOverride')
    if (savedPrompt) {
      setPromptOverride(savedPrompt)
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
    
    if (isStreamingMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text,
        prompt: effectivePrompt
      }))
    } else {
      setIsLoading(true)
      setResponse('')
      fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt: effectivePrompt })
      })
        .then(res => res.json())
        .then(data => {
          setResponse(data.response || data.error || 'Error occurred')
          setIsLoading(false)
        })
        .catch(err => {
          console.error(err)
          setIsLoading(false)
        })
    }
  }, [getEffectivePrompt])

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

  const handlePromptSave = () => {
    localStorage.setItem('promptOverride', promptOverride)
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-50 p-4 border-r">
        <h1 className="text-xl font-bold mb-6">Dutch Tutor</h1>
        
        <div className="mb-4">
          <label className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={isRealTime}
              onChange={(e) => setIsRealTime(e.target.checked)}
              className="w-4 h-4"
            />
            Real-time
          </label>
        </div>
        
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-sm text-blue-600 hover:underline mb-4 block"
        >
          {showPrompt ? 'Verberg' : 'Toon'} Prompt
        </button>
        
        {showPrompt && (
          <div className="p-3 bg-gray-100 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">System Prompt</span>
              <button
                onClick={handlePromptSave}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Opslaan
              </button>
            </div>
            <textarea
              value={promptOverride || prompt}
              onChange={(e) => setPromptOverride(e.target.value)}
              className="w-full p-2 border rounded text-sm font-mono"
              rows={6}
              placeholder="Enter system prompt..."
            />
            {promptOverride && (
              <button
                onClick={() => {
                  setPromptOverride('')
                  localStorage.removeItem('promptOverride')
                }}
                className="text-xs text-red-500 mt-1 hover:underline"
              >
                Reset naar standaard
              </button>
            )}
          </div>
        )}
      </aside>
      
      <main className="flex-1 p-4 max-w-2xl mx-auto">
        {!backendConnected && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Backend disconnected. Please ensure the server is running on port 8080.
          </div>
        )}
        
        <div className="border rounded p-3 bg-white mb-4 min-h-[100px]">
          <div className="text-sm text-gray-500 mb-1">Engels:</div>
          <div className="text-gray-800 whitespace-pre-wrap">
            {response || (isStreaming ? '...' : '')}
          </div>
        </div>
        
        <div className="flex gap-2">
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
          <div className="text-xs text-gray-500 mt-2">
            Druk op Enter om te verzenden
          </div>
        )}
      </main>
    </div>
  )
}