import type { Tab } from '../types'

export const ALL_TABS: Tab[] = ['quiz', 'oefensessie', 'cloze', 'fraselijst', 'vertaler', 'oefeningen', 'herschrijver']

export const DEFAULT_HIDDEN_TABS: Tab[] = ['vertaler', 'oefeningen', 'herschrijver']

export const TAB_LABELS: Record<Tab, string> = {
  quiz: 'Quiz',
  oefensessie: 'Oefensessie',
  fraselijst: 'Fraselijst',
  herschrijver: 'Herschrijver',
  vertaler: 'Engels → Nederlands',
  oefeningen: 'Extra Oefeningen',
  cloze: 'Cloze',
}
