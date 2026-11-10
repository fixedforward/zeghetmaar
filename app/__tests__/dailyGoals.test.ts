import { describe, it, expect } from 'vitest'
import { chatGptGoalsFor, currentStreak, dailyGoalsFor, mergeDates, weekDates } from '../lib/dailyGoals'
import type { Tab } from '../types'

const noDates = () => ({
  quiz: new Set<string>(), cloze: new Set<string>(), oefensessie: new Set<string>(), taaleilanden: new Set<string>(), artikelen: new Set<string>(), luisteren: new Set<string>(),
  schrijven: new Set<string>(), voorzetsels: new Set<string>(),
})
const allTabs: Tab[] = ['quiz', 'cloze', 'oefensessie', 'taaleilanden', 'artikelen', 'luisteren']

describe('dailyGoalsFor', () => {
  it('marks a goal done only when its own log has today', () => {
    const dates = { ...noDates(), cloze: new Set(['2026-11-10']), quiz: new Set(['2026-11-09']) }
    expect(dailyGoalsFor(dates, allTabs, '2026-11-10')).toEqual([
      { tab: 'quiz', done: false },
      { tab: 'cloze', done: true },
      { tab: 'oefensessie', done: false },
      { tab: 'taaleilanden', done: false },
      { tab: 'artikelen', done: false },
      { tab: 'luisteren', done: false },
    ])
  })

  it('leaves out the goals of hidden tabs', () => {
    expect(dailyGoalsFor(noDates(), ['cloze', 'fraselijst'], '2026-11-10')).toEqual([{ tab: 'cloze', done: false }])
  })
})

describe('chatGptGoalsFor', () => {
  it('marks each ChatGPT exercise done only when its own log has today', () => {
    const dates = { ...noDates(), voorzetsels: new Set(['2026-11-10']), schrijven: new Set(['2026-11-09']) }
    expect(chatGptGoalsFor(dates, '2026-11-10')).toEqual([
      { type: 'schrijven', label: 'Schrijfoefening in ChatGPT', done: false },
      { type: 'voorzetsels', label: 'Voorzetseloefening in ChatGPT', done: true },
    ])
  })
})

describe('mergeDates', () => {
  it('keeps every date once', () => {
    expect([...mergeDates([new Set(['2026-11-09', '2026-11-10']), new Set(['2026-11-10'])])].sort()).toEqual(['2026-11-09', '2026-11-10'])
  })
})

describe('currentStreak', () => {
  it('counts the days in a row up to today', () => {
    expect(currentStreak(new Set(['2026-11-08', '2026-11-09', '2026-11-10']), '2026-11-10')).toBe(3)
  })

  it('still counts back from yesterday when today is not done yet', () => {
    expect(currentStreak(new Set(['2026-11-08', '2026-11-09']), '2026-11-10')).toBe(2)
  })

  it('stops at the first day without practice', () => {
    expect(currentStreak(new Set(['2026-11-06', '2026-11-09', '2026-11-10']), '2026-11-10')).toBe(2)
  })

  it('is 0 when neither today nor yesterday was practiced', () => {
    expect(currentStreak(new Set(['2026-11-08']), '2026-11-10')).toBe(0)
  })

  it('carries on across a month end', () => {
    expect(currentStreak(new Set(['2026-10-31', '2026-11-01']), '2026-11-01')).toBe(2)
  })
})

describe('weekDates', () => {
  it('gives Monday to Sunday of the week holding a Tuesday', () => {
    expect(weekDates('2026-11-10')).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ])
  })

  it('puts a Sunday at the end of its week, not the start of the next', () => {
    expect(weekDates('2026-11-15')[0]).toBe('2026-11-09')
    expect(weekDates('2026-11-15')[6]).toBe('2026-11-15')
  })
})
