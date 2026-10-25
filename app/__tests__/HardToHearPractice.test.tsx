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

describe('HardToHearPractice', () => {
  it('plays each new line right away, and again on request', () => {
    const onPlay = vi.fn()
    render(<Harness onPlay={onPlay} />)

    expect(onPlay).toHaveBeenLastCalledWith(lines[0])

    fireEvent.click(screen.getByText('Opnieuw afspelen'))
    expect(onPlay).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getByText('✓ Verstaan (2)'))
    expect(onPlay).toHaveBeenLastCalledWith(lines[1])
  })

  it('has no answer field, and keeps the subtitle folded until I open it, also on the next line', () => {
    render(<Harness onPlay={() => {}} />)

    expect(screen.queryByRole('textbox')).toBeNull()
    const details = () => screen.getByText('Ondertitel tonen').closest('details')!
    expect(details().open).toBe(false)

    fireEvent.click(screen.getByText('Ondertitel tonen'))
    expect(details().open).toBe(true)
    expect(screen.getByText('Dat zie je wel vaker.')).toBeTruthy()

    fireEvent.click(screen.getByText('✗ Niet verstaan (1)'))
    expect(details().open).toBe(false)
    expect(screen.getByText(/0 verstaan, 1 niet verstaan/)).toBeTruthy()
  })

  it('marks with 1 = Niet verstaan and 2 = Verstaan', () => {
    render(<Harness onPlay={() => {}} />)

    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByText(/Fragment 2 van 3 · 0 verstaan, 1 niet verstaan/)).toBeTruthy()

    fireEvent.keyDown(window, { key: '2' })
    expect(screen.getByText(/1 verstaan, 1 niet verstaan/)).toBeTruthy()
  })

  it('ignores 1 and 2 while typing in a field, with a modifier, or when held down', () => {
    render(<><input aria-label="veld" /><Harness onPlay={() => {}} /></>)

    fireEvent.keyDown(screen.getByLabelText('veld'), { key: '2' })
    fireEvent.keyDown(window, { key: '2', metaKey: true })
    fireEvent.keyDown(window, { key: '2', repeat: true })

    expect(screen.getByText(/Fragment 1 van 2 · 0 verstaan, 0 niet verstaan/)).toBeTruthy()
  })
})
