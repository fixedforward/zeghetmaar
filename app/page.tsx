'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ChatBox {
  id: number
  input: string
  response: string
  isStreaming: boolean
}

const DEFAULT_PROMPT = `You are a Dutch to English language tutor. When the user types a Dutch sentence:
1. Provide the English translation
2. Explain what was wrong or not optimal (if anything), max 5 sentences
3. Suggest a better way to say it (if applicable)

Keep feedback concise, max 5 sentences total.`

const WS_URL = typeof window !== 'undefined' ? `ws://${window.location.hostname}:8080` : ''

export default function Home() {
  const [input, setInput] = useState('')
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([])
  const [isRealTime, setIsRealTime] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [showPrompt, setShowPrompt] = useState(true)
  const [promptOverride, setPromptOverride] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const boxIdRef = useRef(0)

  useEffect(() => {
    const savedPrompt = localStorage.getItem('promptOverride')
    if (savedPrompt) {
      setPromptOverride(savedPrompt)
    }
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  const getEffectivePrompt = useCallback(() => {
    return promptOverride || prompt
  }, [prompt, promptOverride])

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    const ws = new WebSocket(WS_URL)
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'chunk') {
        setChatBoxes(prev => {
          const newBoxes = [...prev]
          if (newBoxes.length > 0 && newBoxes[newBoxes.length - 1].isStreaming) {
            newBoxes[newBoxes.length - 1].response += data.content
          }
          return newBoxes
        })
      } else if (data.type === 'done') {
        setChatBoxes(prev => {
          const newBoxes = [...prev]
          if (newBoxes.length > 0) {
            newBoxes[newBoxes.length - 1].isStreaming = false
          }
          return newBoxes
        })
      }
    }
    wsRef.current = ws
  }, [])

  const sendRequest = useCallback((text: string, isStreaming = false) => {
    const effectivePrompt = getEffectivePrompt()
    
    if (isStreaming && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        text,
        prompt: effectivePrompt
      }))
    } else {
      setIsLoading(true)
      fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt: effectivePrompt })
      })
        .then(res => res.json())
        .then(data => {
          const newBox: ChatBox = {
            id: ++boxIdRef.current,
            input: text,
            response: data.response || data.error || 'Error occurred',
            isStreaming: false
          }
          setChatBoxes(prev => {
            const newBoxes = [...prev, newBox]
            if (newBoxes.length > 10) newBoxes.shift()
            return newBoxes
          })
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
    
    const newBox: ChatBox = {
      id: ++boxIdRef.current,
      input: input,
      response: '',
      isStreaming: isRealTime
    }
    
    setChatBoxes(prev => {
      const newBoxes = [...prev, newBox]
      if (newBoxes.length > 10) newBoxes.shift()
      return newBoxes
    })
    
    if (isRealTime) {
      connectWS()
      setTimeout(() => sendRequest(input, true), 100)
    } else {
      sendRequest(input, false)
    }
    
    setInput('')
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    
    if (isRealTime && value.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const newBox: ChatBox = {
          id: ++boxIdRef.current,
          input: value,
          response: '',
          isStreaming: true
        }
        setChatBoxes(prev => {
          const newBoxes = [...prev, newBox]
          if (newBoxes.length > 10) newBoxes.shift()
          return newBoxes
        })
        connectWS()
        setTimeout(() => sendRequest(value, true), 100)
      }, 500)
    }
  }

  const handlePromptSave = () => {
    localStorage.setItem('promptOverride', promptOverride)
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dutch Tutor</h1>
      
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isRealTime}
            onChange={(e) => setIsRealTime(e.target.checked)}
            className="w-4 h-4"
          />
          Real-time (WebSocket, 500ms debounce)
        </label>
        
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showPrompt ? 'Hide' : 'Show'} Prompt
        </button>
      </div>
      
      {showPrompt && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">System Prompt</span>
            <button
              onClick={handlePromptSave}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              Save Override
            </button>
          </div>
          <textarea
            value={promptOverride || prompt}
            onChange={(e) => setPromptOverride(e.target.value)}
            className="w-full p-2 border rounded text-sm font-mono"
            rows={4}
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
              Reset to default
            </button>
          )}
        </div>
      )}
      
      <div className="space-y-3 mb-4">
        {chatBoxes.map((box) => (
          <div key={box.id} className="border rounded p-3 bg-white">
            <div className="text-sm text-gray-500 mb-1">Dutch:</div>
            <div className="mb-2 font-medium">{box.input}</div>
            <div className="text-sm text-gray-500 mb-1">English:</div>
            <div className="text-gray-800 whitespace-pre-wrap">
              {box.response || (box.isStreaming ? '...' : '')}
            </div>
          </div>
        ))}
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
          {isLoading ? 'Sending...' : 'Submit'}
        </button>
      </div>
      
      {!isRealTime && (
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to submit
        </div>
      )}
    </main>
  )
}