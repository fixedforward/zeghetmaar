import type { Tab } from '../types'

// The tabs you can show, hide and order in Instellingen. 'vandaag' isn't one of them:
// it's the start page and always in the menu.
export const ALL_TABS: Tab[] = ['quiz', 'oefensessie', 'cloze', 'fraselijst', 'vertaler', 'oefeningen', 'herschrijver', 'artikelen', 'luisteren', 'fouten', 'taaleilanden']

export const DEFAULT_HIDDEN_TABS: Tab[] = ['vertaler', 'oefeningen', 'herschrijver']

export const TAB_LABELS: Record<Tab, string> = {
  vandaag: 'Vandaag',
  quiz: 'Quiz',
  oefensessie: 'Oefensessie',
  fraselijst: 'Fraselijst',
  herschrijver: 'Herschrijver',
  vertaler: 'Engels → Nederlands',
  oefeningen: 'Extra Oefeningen',
  cloze: 'Cloze',
  artikelen: 'Artikelen',
  luisteren: 'Luisteren',
  fouten: 'Vertaling oefenen',
  taaleilanden: 'Taaleilanden',
}

export interface TabGroup {
  id: 'oefenen' | 'lezen' | 'lijsten' | 'hulpmiddelen'
  label: string
  tabs: Tab[]
}

// The menu's groups. Every tab in ALL_TABS is in exactly one of them.
export const TAB_GROUPS: TabGroup[] = [
  { id: 'oefenen', label: 'Oefenen', tabs: ['quiz', 'cloze', 'oefensessie', 'fouten', 'taaleilanden'] },
  { id: 'lezen', label: 'Lezen & luisteren', tabs: ['artikelen', 'luisteren'] },
  { id: 'lijsten', label: 'Mijn lijsten', tabs: ['fraselijst'] },
  { id: 'hulpmiddelen', label: 'Hulpmiddelen', tabs: ['herschrijver', 'vertaler', 'oefeningen'] },
]

// Each group with only the tabs that are shown, in the order from Instellingen; a group left empty is dropped.
export function groupVisibleTabs(visibleTabs: Tab[]): TabGroup[] {
  return TAB_GROUPS
    .map(group => ({ ...group, tabs: visibleTabs.filter(tab => group.tabs.includes(tab)) }))
    .filter(group => group.tabs.length > 0)
}

export function isTab(value: string): value is Tab {
  return value === 'vandaag' || (ALL_TABS as string[]).includes(value)
}
