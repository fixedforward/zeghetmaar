'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { Tab } from './types'
import { DEFAULT_MODEL, MODEL_OPTIONS } from './config/models'
import { useExercises } from './hooks/useExercises'
import { useWords } from './hooks/useWords'
import { useAiChat } from './hooks/useAiChat'
import { usePhrasePractice } from './hooks/usePhrasePractice'
import { useOefenSessie } from './hooks/useOefenSessie'
import { useQuiz } from './hooks/useQuiz'
import { usePracticeTracker } from './hooks/usePracticeTracker'
import { FraselijstTab } from './components/FraselijstTab'
import { HerschrijverTab } from './components/HerschrijverTab'
import { VertalerTab } from './components/VertalerTab'
import { OefeningenTab } from './components/OefeningenTab'
import { OefenSessieTab } from './components/OefenSessieTab'
import { QuizTab } from './components/QuizTab'
import { SelectionPopup } from './components/SelectionPopup'
import { PracticeModal } from './components/PracticeModal'
import { ErrorBoundary } from './components/ErrorBoundary'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: 'Dit Google-account heeft geen toegang tot deze app.',
}
const DEFAULT_AUTH_ERROR_MESSAGE = 'Inloggen is niet gelukt. Probeer het opnieuw.'

export default function HomeClient() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('quiz')
  const [activeModel, setActiveModel] = useState(DEFAULT_MODEL)
  const [authError, setAuthError] = useState<string | null>(null)
  const { data: session } = useSession()
  const oefenSessieTracker = usePracticeTracker('oefensessie', !!session)
  const quizTracker = usePracticeTracker('quiz', !!session)

  const exercises = useExercises()
  const words = useWords(activeModel)
  const chat = useAiChat(activeModel)
  const practice = usePhrasePractice(activeModel, words.words)
  const oefenSessie = useOefenSessie(activeModel, oefenSessieTracker.markPracticedToday)
  const quiz = useQuiz(quizTracker.markPracticedToday)

  useEffect(() => {
    setMounted(true)
    words.loadWords()
    quiz.loadFiles()

    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) {
      setAuthError(AUTH_ERROR_MESSAGES[error] ?? DEFAULT_AUTH_ERROR_MESSAGE)
      params.delete('error')
      const query = params.toString()
      window.history.replaceState({}, '', query ? `?${query}` : window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (session) {
      oefenSessieTracker.loadPracticeLog()
      quizTracker.loadPracticeLog()
    }
  }, [session, oefenSessieTracker.loadPracticeLog, quizTracker.loadPracticeLog])

  if (!mounted) return null

  return (
    <div className="min-h-screen">
      <main className="p-4 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold">Nederlands Oefenen</h1>
        </div>
        {authError && (
          <div className="flex items-start justify-between gap-3 mb-3 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">
            <span>{authError}</span>
            <button
              onClick={() => setAuthError(null)}
              className="text-red-400 hover:text-red-600 leading-none shrink-0"
              title="Sluiten"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex justify-end items-center gap-3 mb-2">
          <select
            value={activeModel}
            onChange={e => setActiveModel(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white text-gray-700"
          >
            {MODEL_OPTIONS.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
              Log in om frases te beheren
            </button>
          )}
        </div>

        <div className="flex border-b mb-4">
          <button
            onClick={() => { setActiveTab('quiz'); quiz.loadFiles() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'quiz' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Quiz
          </button>
          <button
            onClick={() => { setActiveTab('oefensessie'); words.loadWords() }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'oefensessie' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Oefensessie
          </button>
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
        {activeTab === 'oefensessie' && (
          <ErrorBoundary>
            <OefenSessieTab
              {...oefenSessie}
              {...words}
              isLoggedIn={!!session}
              practicedDates={oefenSessieTracker.practicedDates}
              onCheckIn={oefenSessieTracker.markPracticedToday}
              onCancelCheckIn={oefenSessieTracker.cancelPracticedToday}
            />
          </ErrorBoundary>
        )}
        {activeTab === 'quiz' && (
          <ErrorBoundary>
            <QuizTab
              {...quiz}
              isLoggedIn={!!session}
              practicedDates={quizTracker.practicedDates}
              onCheckIn={quizTracker.markPracticedToday}
              onCancelCheckIn={quizTracker.cancelPracticedToday}
            />
          </ErrorBoundary>
        )}
      </main>

      {chat.selectionPopup && (
        <SelectionPopup popup={chat.selectionPopup} onClose={() => chat.setSelectionPopup(null)} />
      )}
      <PracticeModal {...practice} />
    </div>
  )
}
