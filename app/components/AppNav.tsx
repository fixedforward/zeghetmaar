import { useState } from 'react'
import type { Tab } from '../types'
import { TAB_LABELS, groupVisibleTabs, type TabGroup } from '../config/tabs'
import { TabIcon, type IconName } from './TabIcon'

type Props = {
  activeTab: Tab
  visibleTabs: Tab[]
  doneToday: Set<Tab>
  onSelect: (tab: Tab) => void
  onOpenSettings: () => void
}

function NavItem({ tab, active, done, onSelect }: { tab: Tab; active: boolean; done: boolean; onSelect: (tab: Tab) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-current={active ? 'page' : undefined}
      className={[
        'w-full min-h-10 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
        active ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-gray-700 font-medium hover:bg-gray-100',
      ].join(' ')}
    >
      <TabIcon name={tab} />
      <span className="flex-1">{TAB_LABELS[tab]}</span>
      {done && <span className="text-green-700" title="Vandaag gedaan">✓</span>}
    </button>
  )
}

function NavGroups({ groups, activeTab, doneToday, onSelect }: { groups: TabGroup[] } & Pick<Props, 'activeTab' | 'doneToday' | 'onSelect'>) {
  return (
    <>
      {groups.map(group => (
        <div key={group.id} className="space-y-0.5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{group.label}</p>
          {group.tabs.map(tab => (
            <NavItem key={tab} tab={tab} active={tab === activeTab} done={doneToday.has(tab)} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </>
  )
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full min-h-10 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
      <TabIcon name="instellingen" />
      Instellingen
    </button>
  )
}

// Desktop: a menu on the left with the tabs in groups.
export function SideNav({ activeTab, visibleTabs, doneToday, onSelect, onOpenSettings }: Props) {
  return (
    <nav aria-label="Hoofdmenu" className="hidden md:flex flex-col gap-5 w-60 shrink-0 h-screen sticky top-0 overflow-y-auto border-r border-gray-200 bg-white px-3 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center">
          <TabIcon name="oefensessie" className="w-5 h-5" />
        </span>
        <div>
          <p className="font-bold leading-tight">Zeg Het Maar</p>
          <p className="text-xs text-gray-500">Nederlands oefenen</p>
        </div>
      </div>
      <NavItem tab="vandaag" active={activeTab === 'vandaag'} done={false} onSelect={onSelect} />
      <NavGroups groups={groupVisibleTabs(visibleTabs)} activeTab={activeTab} doneToday={doneToday} onSelect={onSelect} />
      <div className="mt-auto">
        <SettingsButton onClick={onOpenSettings} />
      </div>
    </nav>
  )
}

type Sheet = 'oefenen' | 'meer'

// Phone: a bar at the bottom. Oefenen and Meer open a sheet with the tabs of their groups.
export function BottomNav({ activeTab, visibleTabs, doneToday, onSelect, onOpenSettings }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const groups = groupVisibleTabs(visibleTabs)
  const practiceGroup = groups.find(g => g.id === 'oefenen')
  const directTabs = (['fraselijst', 'luisteren'] as Tab[]).filter(tab => visibleTabs.includes(tab))
  const inMeer = activeTab !== 'vandaag' && !directTabs.includes(activeTab) && !practiceGroup?.tabs.includes(activeTab)

  const select = (tab: Tab) => {
    setSheet(null)
    onSelect(tab)
  }

  const barButton = (key: string, label: string, icon: IconName, active: boolean, onClick: () => void) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-h-13 flex flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'text-blue-800 font-semibold' : 'text-gray-500 font-medium'}`}
    >
      <TabIcon name={icon} className="w-[22px] h-[22px]" />
      {label}
    </button>
  )

  return (
    <>
      <nav aria-label="Hoofdmenu" className="md:hidden fixed inset-x-0 bottom-0 z-20 flex border-t border-gray-200 bg-white px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {barButton('vandaag', TAB_LABELS.vandaag, 'vandaag', activeTab === 'vandaag', () => select('vandaag'))}
        {practiceGroup && barButton('oefenen', 'Oefenen', 'cloze', practiceGroup.tabs.includes(activeTab), () => setSheet('oefenen'))}
        {directTabs.map(tab => barButton(tab, TAB_LABELS[tab], tab, activeTab === tab, () => select(tab)))}
        {barButton('meer', 'Meer', 'meer', inMeer, () => setSheet('meer'))}
      </nav>

      {sheet && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === 'oefenen' ? 'Oefenen' : 'Meer'}
            onClick={e => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white px-3 pt-4 pb-8 space-y-4"
          >
            <NavGroups
              groups={sheet === 'oefenen' && practiceGroup ? [practiceGroup] : groups}
              activeTab={activeTab}
              doneToday={doneToday}
              onSelect={select}
            />
            {sheet === 'meer' && (
              <SettingsButton onClick={() => { setSheet(null); onOpenSettings() }} />
            )}
          </div>
        </div>
      )}
    </>
  )
}
