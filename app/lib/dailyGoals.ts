import type { Tab } from '../types'
import type { PracticeLogType } from './practiceLog'
import { addDaysIso } from './date'

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
