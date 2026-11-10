import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { BottomNav, SideNav } from '../components/AppNav'

const baseProps = (): ComponentProps<typeof SideNav> => ({
  activeTab: 'vandaag',
  visibleTabs: ['quiz', 'cloze', 'fraselijst', 'luisteren', 'artikelen'],
  doneToday: new Set(['cloze']),
  onSelect: vi.fn(),
  onOpenSettings: vi.fn(),
})

describe('SideNav', () => {
  it('shows the shown tabs under their group headings', () => {
    render(<SideNav {...baseProps()} />)
    expect(screen.getByText('Oefenen')).toBeTruthy()
    expect(screen.getByText('Lezen & luisteren')).toBeTruthy()
    expect(screen.queryByText('Hulpmiddelen')).toBeNull()
  })

  it('marks the open tab and the goals done today', () => {
    render(<SideNav {...baseProps()} activeTab="quiz" />)
    expect(screen.getByRole('button', { name: /Quiz/ }).getAttribute('aria-current')).toBe('page')
    expect(within(screen.getByRole('button', { name: /Cloze/ })).getByTitle('Vandaag gedaan')).toBeTruthy()
  })
})

describe('BottomNav', () => {
  it('opens the Oefenen sheet and picks a tab from it', () => {
    const props = baseProps()
    render(<BottomNav {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Oefenen' }))
    const sheet = screen.getByRole('dialog', { name: 'Oefenen' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Quiz/ }))
    expect(props.onSelect).toHaveBeenCalledWith('quiz')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('puts the other groups and Instellingen under Meer', () => {
    const props = baseProps()
    render(<BottomNav {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Meer' }))
    const sheet = screen.getByRole('dialog', { name: 'Meer' })
    expect(within(sheet).getByRole('button', { name: /Artikelen/ })).toBeTruthy()
    fireEvent.click(within(sheet).getByText('Instellingen'))
    expect(props.onOpenSettings).toHaveBeenCalledOnce()
  })

  it('leaves out Oefenen when every practice tab is hidden', () => {
    render(<BottomNav {...baseProps()} visibleTabs={['fraselijst']} />)
    expect(screen.queryByRole('button', { name: 'Oefenen' })).toBeNull()
  })
})
