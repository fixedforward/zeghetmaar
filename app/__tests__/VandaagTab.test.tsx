import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { VandaagTab } from '../components/VandaagTab'

function renderVandaag(overrides: Partial<ComponentProps<typeof VandaagTab>> = {}) {
  const props: ComponentProps<typeof VandaagTab> = {
    isLoggedIn: true,
    today: '2026-11-10',
    goals: [
      { tab: 'quiz', done: false },
      { tab: 'cloze', done: true },
      { tab: 'luisteren', done: false },
    ],
    streak: 12,
    practicedDays: new Set(['2026-11-09', '2026-11-10']),
    recentWords: [],
    onSelect: vi.fn(),
    onCheckInListening: vi.fn(),
    onSignIn: vi.fn(),
    ...overrides,
  }
  render(<VandaagTab {...props} />)
  return props
}

describe('VandaagTab', () => {
  it('says how many goals are done and offers the first open one next', () => {
    const props = renderVandaag()
    expect(screen.getByText('Je hebt 1 van de 3 dagdoelen gehaald.')).toBeTruthy()
    fireEvent.click(screen.getByText('▶ Volgende: Quiz'))
    expect(props.onSelect).toHaveBeenCalledWith('quiz')
  })

  it('shows each goal as done or not done', () => {
    renderVandaag()
    const cloze = screen.getByText('Cloze').closest('article') as HTMLElement
    const quiz = screen.getByText('Quiz').closest('article') as HTMLElement
    expect(within(cloze).getByText('Gedaan')).toBeTruthy()
    expect(within(quiz).getByText('Nog niet')).toBeTruthy()
  })

  it('lets you check in for listening by hand', () => {
    const props = renderVandaag()
    fireEvent.click(screen.getByText('Ik heb vandaag geluisterd'))
    expect(props.onCheckInListening).toHaveBeenCalledOnce()
  })

  it('shows the streak', () => {
    renderVandaag()
    expect(screen.getByText('12 dagen op rij')).toBeTruthy()
  })

  it('has no Volgende button once every goal is done', () => {
    renderVandaag({ goals: [{ tab: 'cloze', done: true }] })
    expect(screen.getByText('Alle dagdoelen gehaald. Goed bezig!')).toBeTruthy()
    expect(screen.queryByText(/Volgende/)).toBeNull()
  })

  it('asks you to log in instead of showing goals when logged out', () => {
    const props = renderVandaag({ isLoggedIn: false })
    expect(screen.queryByText('Dagdoelen')).toBeNull()
    fireEvent.click(screen.getByText('Inloggen met Google'))
    expect(props.onSignIn).toHaveBeenCalledOnce()
  })
})
