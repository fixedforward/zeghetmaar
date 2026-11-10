import { describe, it, expect } from 'vitest'
import { ALL_TABS, TAB_GROUPS, groupVisibleTabs, isTab } from '../config/tabs'

describe('TAB_GROUPS', () => {
  it('holds every tab from Instellingen exactly once', () => {
    const grouped = TAB_GROUPS.flatMap(g => g.tabs)
    expect([...grouped].sort()).toEqual([...ALL_TABS].sort())
  })
})

describe('groupVisibleTabs', () => {
  it('keeps the order from Instellingen inside a group', () => {
    const oefenen = groupVisibleTabs(['taaleilanden', 'quiz', 'cloze']).find(g => g.id === 'oefenen')
    expect(oefenen?.tabs).toEqual(['taaleilanden', 'quiz', 'cloze'])
  })

  it('drops a group whose tabs are all hidden', () => {
    expect(groupVisibleTabs(['quiz', 'fraselijst']).map(g => g.id)).toEqual(['oefenen', 'lijsten'])
  })
})

describe('isTab', () => {
  it('accepts vandaag and every tab from Instellingen', () => {
    expect(isTab('vandaag')).toBe(true)
    expect(ALL_TABS.every(isTab)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isTab('instellingen')).toBe(false)
  })
})
