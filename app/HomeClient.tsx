'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import type { Tab } from './types'
import { DEFAULT_MODEL } from './config/models'
import { useExercises } from './hooks/useExercises'
import { useWords } from './hooks/useWords'
import { useAiChat } from './hooks/useAiChat'
import { usePhrasePractice } from './hooks/usePhrasePractice'
import { useOefenSessie } from './hooks/useOefenSessie'
import { useQuiz } from './hooks/useQuiz'
import { useCloze } from './hooks/useCloze'
import { usePracticeTracker } from './hooks/usePracticeTracker'
import { useTabSettings } from './hooks/useTabSettings'
import { TAB_LABELS } from './config/tabs'
import { FraselijstTab } from './components/FraselijstTab'
import { HerschrijverTab } from './components/HerschrijverTab'
import { VertalerTab } from './components/VertalerTab'
import { OefeningenTab } from './components/OefeningenTab'
import { OefenSessieTab } from './components/OefenSessieTab'
import { QuizTab } from './components/QuizTab'
import { ClozeTab } from './components/ClozeTab'
import { SelectionPopup } from './components/SelectionPopup'
import { PracticeModal } from './components/PracticeModal'
import { SettingsModal } from './components/SettingsModal'
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
  const clozeTracker = usePracticeTracker('cloze', !!session)

  const exercises = useExercises()
  const words = useWords(activeModel)
  const chat = useAiChat(activeModel)
  const practice = usePhrasePractice(activeModel, words.words)
  const oefenSessie = useOefenSessie(activeModel, oefenSessieTracker.markPracticedToday)
  const quiz = useQuiz(quizTracker.markPracticedToday)
  const cloze = useCloze(clozeTracker.markPracticedToday)
  const tabSettings = useTabSettings()

  const selectTab = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'quiz') quiz.loadFiles()
    if (tab === 'oefensessie' || tab === 'fraselijst' || tab === 'cloze') words.loadWords()
  }

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
      clozeTracker.loadPracticeLog()
    }
  }, [session, oefenSessieTracker.loadPracticeLog, quizTracker.loadPracticeLog, clozeTracker.loadPracticeLog])

  useEffect(() => {
    if (tabSettings.visibleTabs.length > 0 && !tabSettings.visibleTabs.includes(activeTab)) {
      setActiveTab(tabSettings.visibleTabs[0])
    }
  }, [tabSettings.visibleTabs, activeTab])

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

        <div className="flex border-b mb-4 items-center justify-between">
          <div className="flex flex-wrap">
            {tabSettings.visibleTabs.map(tab => (
              <button
                key={tab}
                onClick={() => selectTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
          <button
            onClick={tabSettings.open}
            title="Instellingen"
            className="text-gray-400 hover:text-gray-600 text-lg px-2 shrink-0"
          >
            ⚙
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
        {activeTab === 'cloze' && (
          <ErrorBoundary>
            <ClozeTab
              {...cloze}
              {...words}
              isLoggedIn={!!session}
              practicedDates={clozeTracker.practicedDates}
              onCheckIn={clozeTracker.markPracticedToday}
              onCancelCheckIn={clozeTracker.cancelPracticedToday}
            />
          </ErrorBoundary>
        )}
      </main>

      {chat.selectionPopup && (
        <SelectionPopup popup={chat.selectionPopup} onClose={() => chat.setSelectionPopup(null)} />
      )}
      <PracticeModal {...practice} />
      <SettingsModal
        {...tabSettings}
        activeModel={activeModel}
        setActiveModel={setActiveModel}
        session={session}
        onSignIn={() => signIn('google')}
        onSignOut={() => signOut()}
      />
    </div>
  )
}
