import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useEffect } from 'react'
import { HardToHearPractice } from '../components/HardToHearPractice'
import { useHardToHearPractice } from '../hooks/useHardToHearPractice'
import type { HardToHearPhrase } from '../types'

vi.mock('../lib/shuffle', () => ({ shuffleArray: <T,>(items: T[]) => items }))

const lines: HardToHearPhrase[] = [
  { id: 'a', text: 'Dat zie je wel vaker.', seconds: 6, endSeconds: 8, createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'b', text: 'Ja hoor.', seconds: 10, endSeconds: 11, createdAt: '2024-01-01T00:00:00.000Z' },
]

function Harness({ onPlay }: { onPlay: (phrase: HardToHearPhrase) => void }) {
  const practice = useHardToHearPractice()
  useEffect(() => { practice.start(lines) }, [])
  return practice.active ? <HardToHearPractice practice={practice} onPlay={onPlay} /> : null
}

const field = () => screen.getByPlaceholderText(/Typ wat je hoort/)

describe('HardToHearPractice', () => {
  it('plays each new line right away, and again on request', () => {
    const onPlay = vi.fn()
    render(<Harness onPlay={onPlay} />)

    expect(onPlay).toHaveBeenLastCalledWith(lines[0])

    fireEvent.click(screen.getByText('▶ Opnieuw afspelen'))
    expect(onPlay).toHaveBeenCalledTimes(2)

    fireEvent.change(field(), { target: { value: 'dat zie je wel vaker' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    fireEvent.keyDown(field(), { key: 'Enter' })

    expect(onPlay).toHaveBeenLastCalledWith(lines[1])
  })

  it('shows the real line with the words I missed marked, and lets me count it as goed anyway', () => {
    render(<Harness onPlay={() => {}} />)

    fireEvent.change(field(), { target: { value: 'dat zie wel vaker' } })
    fireEvent.click(screen.getByText('Controleren'))

    expect(screen.getByText('✗ Niet helemaal:')).toBeTruthy()
    expect(screen.getByText(/je/, { selector: 'span.text-red-600' })).toBeTruthy()

    fireEvent.click(screen.getByText('Toch goed'))
    expect(screen.getByText(/1 goed, 0 fout/)).toBeTruthy()
  })
})
