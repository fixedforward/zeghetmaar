'use client'

import { useState, useEffect } from 'react'
import type { Tab } from './types'
import { MODELS } from './config/models'
import { useModelSelection } from './hooks/useModelSelection'
import { useExercises } from './hooks/useExercises'
import { useWords } from './hooks/useWords'
import { useAiChat } from './hooks/useAiChat'
import { FraselijstTab } from './components/FraselijstTab'
import { HerschrijverTab } from './components/HerschrijverTab'
import { VertalerTab } from './components/VertalerTab'
import { OefeningenTab } from './components/OefeningenTab'
import { SelectionPopup } from './components/SelectionPopup'

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

        {activeTab === 'fraselijst' && <FraselijstTab {...words} />}
        {activeTab === 'herschrijver' && <HerschrijverTab {...chat} />}
        {activeTab === 'vertaler' && <VertalerTab {...chat} />}
        {activeTab === 'oefeningen' && <OefeningenTab {...exercises} />}
      </main>

      {chat.selectionPopup && (
        <SelectionPopup popup={chat.selectionPopup} onClose={() => chat.setSelectionPopup(null)} />
      )}
    </div>
  )
}
