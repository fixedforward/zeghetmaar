import type { Tab, WordEntry } from '../types'
import type { PracticeLogType } from './practiceLog'
import { addDaysIso, localIsoDate } from './date'

type TabLogType = Extract<PracticeLogType, Tab>

// The tabs with a daily counter, in the order the Vandaag page shows them.
export const DAILY_GOALS: TabLogType[] = ['quiz', 'cloze', 'oefensessie', 'taaleilanden', 'artikelen', 'luisteren']

export interface DailyGoal {
  tab: TabLogType
  done: boolean
}

// Exercises I do in ChatGPT, outside the app: only checked in by hand.
export const CHATGPT_GOALS = [
  { type: 'schrijven', label: 'Schrijfoefening in ChatGPT' },
  { type: 'voorzetsels', label: 'Voorzetseloefening in ChatGPT' },
] as const satisfies readonly { type: Exclude<PracticeLogType, Tab>; label: string }[]

export type ChatGptGoalType = (typeof CHATGPT_GOALS)[number]['type']

export interface ChatGptGoal {
  type: ChatGptGoalType
  label: string
  done: boolean
}

export function chatGptGoalsFor(practicedDates: Record<PracticeLogType, Set<string>>, today: string): ChatGptGoal[] {
  return CHATGPT_GOALS.map(({ type, label }) => ({ type, label, done: practicedDates[type].has(today) }))
}

// Only the goals of tabs that are shown: a hidden tab isn't a goal.
export function dailyGoalsFor(practicedDates: Record<PracticeLogType, Set<string>>, visibleTabs: Tab[], today: string): DailyGoal[] {
  return DAILY_GOALS
    .filter(tab => visibleTabs.includes(tab))
    .map(tab => ({ tab, done: practicedDates[tab].has(today) }))
}

// Collect at least this many new phrases in the Fraselijst every day.
export const WORD_GOAL_TARGET = 5

export interface WordGoal {
  added: number
  target: number
  done: boolean
}

function wordsAddedPerDay(words: WordEntry[]): Map<string, number> {
  const perDay = new Map<string, number>()
  for (const word of words) {
    if (word.createdAt === undefined) continue
    const day = localIsoDate(new Date(word.createdAt))
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  return perDay
}

export function wordGoalFor(words: WordEntry[], today: string): WordGoal {
  const added = wordsAddedPerDay(words).get(today) ?? 0
  return { added, target: WORD_GOAL_TARGET, done: added >= WORD_GOAL_TARGET }
}

// The days on which the word goal was reached, so they count toward the streak.
export function wordGoalDates(words: WordEntry[]): Set<string> {
  return new Set([...wordsAddedPerDay(words)].filter(([, count]) => count >= WORD_GOAL_TARGET).map(([day]) => day))
}

// Every day on which at least one goal was done.
export function mergeDates(dateSets: Set<string>[]): Set<string> {
  return new Set(dateSets.flatMap(dates => [...dates]))
}

// Days in a row with practice, counting back from today. Today not done yet doesn't
// break the streak: then it counts back from yesterday.
export function currentStreak(practicedDays: Set<string>, today: string): number {
  let day = practicedDays.has(today) ? today : addDaysIso(today, -1)
  let count = 0
  while (practicedDays.has(day)) {
    count++
    day = addDaysIso(day, -1)
  }
  return count
}

// Monday to Sunday of the week that holds `today`.
export function weekDates(today: string): string[] {
  const daysSinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const monday = addDaysIso(today, -daysSinceMonday)
  return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i))
}
