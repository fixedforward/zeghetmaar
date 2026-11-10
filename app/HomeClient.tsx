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
import { useArticles } from './hooks/useArticles'
import { useListeningTree } from './hooks/useListeningTree'
import { useLanguageIslands } from './hooks/useLanguageIslands'
import { usePracticeTracker } from './hooks/usePracticeTracker'
import { useTabSettings } from './hooks/useTabSettings'
import { TAB_LABELS, isTab } from './config/tabs'
import { chatGptGoalsFor, currentStreak, dailyGoalsFor, mergeDates } from './lib/dailyGoals'
import { todayLocalIso } from './lib/date'
import { newestWords } from './lib/wordFilters'
import { SideNav, BottomNav } from './components/AppNav'
import { VandaagTab } from './components/VandaagTab'
import { FraselijstTab } from './components/FraselijstTab'
import { HerschrijverTab } from './components/HerschrijverTab'
import { VertalerTab } from './components/VertalerTab'
import { OefeningenTab } from './components/OefeningenTab'
import { OefenSessieTab } from './components/OefenSessieTab'
import { QuizTab } from './components/QuizTab'
import { ClozeTab } from './components/ClozeTab'
import { ArtikelenTab } from './components/ArtikelenTab'
import { LuisterenTab } from './components/LuisterenTab'
import { TaaleilandenTab } from './components/TaaleilandenTab'
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
  const [activeTab, setActiveTab] = useState<Tab>('vandaag')
  const [activeModel, setActiveModel] = useState(DEFAULT_MODEL)
  const [authError, setAuthError] = useState<string | null>(null)
  const { data: session } = useSession()
  const oefenSessieTracker = usePracticeTracker('oefensessie', !!session)
  const quizTracker = usePracticeTracker('quiz', !!session)
  const clozeTracker = usePracticeTracker('cloze', !!session)
  const taaleilandenTracker = usePracticeTracker('taaleilanden', !!session)
  const artikelenTracker = usePracticeTracker('artikelen', !!session)
  const luisterenTracker = usePracticeTracker('luisteren', !!session)
  const chatGptTrackers = {
    schrijven: usePracticeTracker('schrijven', !!session),
    voorzetsels: usePracticeTracker('voorzetsels', !!session),
  }

  const exercises = useExercises()
  const words = useWords(activeModel)
  const chat = useAiChat(activeModel)
  const practice = usePhrasePractice(activeModel, words.words)
  const oefenSessie = useOefenSessie(activeModel, oefenSessieTracker.markPracticedToday)
  const quiz = useQuiz(quizTracker.markPracticedToday)
  const cloze = useCloze(clozeTracker.markPracticedToday)
  const articles = useArticles(artikelenTracker.markPracticedToday)
  const listeningTree = useListeningTree()
  const languageIslands = useLanguageIslands()
  const tabSettings = useTabSettings()

  const selectTab = (tab: Tab) => {
    setActiveTab(tab)
    window.scrollTo(0, 0)
    if (tab === 'quiz') quiz.loadFiles()
    if (tab === 'oefensessie' || tab === 'fraselijst' || tab === 'cloze' || tab === 'vandaag') words.loadWords()
  }

  useEffect(() => {
    setMounted(true)
    words.loadWords()
    quiz.loadFiles()

    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) setAuthError(AUTH_ERROR_MESSAGES[error] ?? DEFAULT_AUTH_ERROR_MESSAGE)
    // e.g. /?tab=luisteren from the "← Luisteren" link on the player page.
    const tab = params.get('tab')
    if (tab && isTab(tab)) selectTab(tab)
    if (error || tab) {
      params.delete('error')
      params.delete('tab')
      const query = params.toString()
      window.history.replaceState({}, '', query ? `?${query}` : window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (session) {
      oefenSessieTracker.loadPracticeLog()
      quizTracker.loadPracticeLog()
      clozeTracker.loadPracticeLog()
      taaleilandenTracker.loadPracticeLog()
      artikelenTracker.loadPracticeLog()
      luisterenTracker.loadPracticeLog()
      chatGptTrackers.schrijven.loadPracticeLog()
      chatGptTrackers.voorzetsels.loadPracticeLog()
      quiz.loadPreparedFileIds()
    }
  }, [
    session,
    oefenSessieTracker.loadPracticeLog, quizTracker.loadPracticeLog, clozeTracker.loadPracticeLog,
    taaleilandenTracker.loadPracticeLog, artikelenTracker.loadPracticeLog, luisterenTracker.loadPracticeLog,
    chatGptTrackers.schrijven.loadPracticeLog, chatGptTrackers.voorzetsels.loadPracticeLog,
    quiz.loadPreparedFileIds,
  ])

  useEffect(() => {
    if (activeTab !== 'vandaag' && tabSettings.visibleTabs.length > 0 && !tabSettings.visibleTabs.includes(activeTab)) {
      setActiveTab('vandaag')
    }
  }, [tabSettings.visibleTabs, activeTab])

  if (!mounted) return null

  const today = todayLocalIso()
  const practicedDates = {
    quiz: quizTracker.practicedDates,
    cloze: clozeTracker.practicedDates,
    oefensessie: oefenSessieTracker.practicedDates,
    taaleilanden: taaleilandenTracker.practicedDates,
    artikelen: artikelenTracker.practicedDates,
    luisteren: luisterenTracker.practicedDates,
    schrijven: chatGptTrackers.schrijven.practicedDates,
    voorzetsels: chatGptTrackers.voorzetsels.practicedDates,
  }
  const goals = dailyGoalsFor(practicedDates, tabSettings.visibleTabs, today)
  const practicedDays = mergeDates(Object.values(practicedDates))
  const navProps = {
    activeTab,
    visibleTabs: tabSettings.visibleTabs,
    doneToday: new Set<Tab>(goals.filter(g => g.done).map(g => g.tab)),
    onSelect: selectTab,
    onOpenSettings: tabSettings.open,
  }

  return (
    <div className="min-h-screen md:flex">
      <SideNav {...navProps} />
      <div className="flex-1 min-w-0">
        <main className="p-4 pb-28 md:px-8 md:py-8 max-w-3xl mx-auto">
          <h1 className="md:hidden text-lg font-bold mb-3">Zeg Het Maar</h1>
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
          {activeTab !== 'vandaag' && <h2 className="text-2xl font-bold tracking-tight mb-4">{TAB_LABELS[activeTab]}</h2>}

          {activeTab === 'vandaag' && (
            <ErrorBoundary>
              <VandaagTab
                isLoggedIn={!!session}
                today={today}
                goals={goals}
                streak={currentStreak(practicedDays, today)}
                practicedDays={practicedDays}
                recentWords={newestWords(words.words, 4)}
                onSelect={selectTab}
                onCheckInListening={luisterenTracker.markPracticedToday}
                chatGptGoals={chatGptGoalsFor(practicedDates, today)}
                onCheckInChatGpt={type => chatGptTrackers[type].markPracticedToday()}
                onCancelChatGpt={type => chatGptTrackers[type].cancelPracticedToday()}
                onSignIn={() => signIn('google')}
              />
            </ErrorBoundary>
          )}
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
                {...words}
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
                tracker={{
                  practicedDates: clozeTracker.practicedDates,
                  onCheckIn: clozeTracker.markPracticedToday,
                  onCancelCheckIn: clozeTracker.cancelPracticedToday,
                }}
              />
            </ErrorBoundary>
          )}
          {activeTab === 'artikelen' && (
            <ErrorBoundary>
              <ArtikelenTab
                {...articles}
                isLoggedIn={!!session}
                words={words}
                tracker={{
                  practicedDates: artikelenTracker.practicedDates,
                  onCheckIn: artikelenTracker.markPracticedToday,
                  onCancelCheckIn: artikelenTracker.cancelPracticedToday,
                }}
              />
            </ErrorBoundary>
          )}
          {activeTab === 'luisteren' && (
            <ErrorBoundary>
              <LuisterenTab
                isLoggedIn={!!session}
                listeningTree={listeningTree}
                tracker={{
                  practicedDates: luisterenTracker.practicedDates,
                  onCheckIn: luisterenTracker.markPracticedToday,
                  onCancelCheckIn: luisterenTracker.cancelPracticedToday,
                }}
              />
            </ErrorBoundary>
          )}
          {activeTab === 'taaleilanden' && (
            <ErrorBoundary>
              <TaaleilandenTab
                {...languageIslands}
                isLoggedIn={!!session}
                tracker={{
                  practicedDates: taaleilandenTracker.practicedDates,
                  onCheckIn: taaleilandenTracker.markPracticedToday,
                  onCancelCheckIn: taaleilandenTracker.cancelPracticedToday,
                }}
              />
            </ErrorBoundary>
          )}
        </main>
      </div>
      <BottomNav {...navProps} />

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
