'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { Tab } from './types'
import { DEFAULT_MODEL, EXPENSIVE_MODEL } from './config/models'
import { useExercises } from './hooks/useExercises'
import { useWords } from './hooks/useWords'
import { useAiChat } from './hooks/useAiChat'
import { usePhrasePractice } from './hooks/usePhrasePractice'
import { FraselijstTab } from './components/FraselijstTab'
import { HerschrijverTab } from './components/HerschrijverTab'
import { VertalerTab } from './components/VertalerTab'
import { OefeningenTab } from './components/OefeningenTab'
import { SelectionPopup } from './components/SelectionPopup'
import { PracticeModal } from './components/PracticeModal'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('fraselijst')
  const [useExpensive, setUseExpensive] = useState(false)
  const { data: session } = useSession()

  const activeModel = useExpensive ? EXPENSIVE_MODEL : DEFAULT_MODEL

  const exercises = useExercises()
  const words = useWords(activeModel)
  const chat = useAiChat(activeModel)
  const practice = usePhrasePractice(activeModel)

  useEffect(() => {
    setMounted(true)
    words.loadWords()
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen">
      <main className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold">Nederlands Oefenen</h1>
        </div>
        <div className="flex justify-end items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
            <span>{useExpensive ? 'Duur model' : 'Gratis model'}</span>
            <div
              onClick={() => setUseExpensive(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${useExpensive ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${useExpensive ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
        <div className="flex justify-end items-center gap-2 mb-4">
          {session ? (
            <>
              {session.user?.image && (
                <img src={session.user.image} alt="avatar" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-gray-700">{session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="text-sm border rounded px-2 py-1 bg-white text-gray-700 hover:bg-gray-100"
              >
                Uitloggen
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="text-sm border rounded px-2 py-1 bg-white text-gray-700 hover:bg-gray-100"
            >
              Log in met Google
            </button>
          )}
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

        {activeTab === 'fraselijst' && <ErrorBoundary><FraselijstTab {...words} isLoggedIn={!!session} onPractice={practice.open} /></ErrorBoundary>}
        {activeTab === 'herschrijver' && <ErrorBoundary><HerschrijverTab {...chat} /></ErrorBoundary>}
        {activeTab === 'vertaler' && <ErrorBoundary><VertalerTab {...chat} /></ErrorBoundary>}
        {activeTab === 'oefeningen' && <ErrorBoundary><OefeningenTab {...exercises} /></ErrorBoundary>}
      </main>

      {chat.selectionPopup && (
        <SelectionPopup popup={chat.selectionPopup} onClose={() => chat.setSelectionPopup(null)} />
      )}
      <PracticeModal {...practice} />
    </div>
  )
}
