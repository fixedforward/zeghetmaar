import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FocusScreen } from '../components/FocusScreen'

describe('FocusScreen', () => {
  it('shows the title, progress, status and shortcuts around the card', () => {
    render(
      <FocusScreen title="Cloze" progress={{ current: 7, total: 32 }} status="5 goed · 1 fout" shortcuts={[{ keys: 'Spatie', label: 'omdraaien' }]} onStop={() => {}}>
        <p>het valt mee</p>
      </FocusScreen>,
    )
    expect(screen.getByRole('region', { name: 'Cloze' })).toBeTruthy()
    expect(screen.getByText('7 / 32')).toBeTruthy()
    expect(screen.getByText('5 goed · 1 fout')).toBeTruthy()
    expect(screen.getByText('Spatie')).toBeTruthy()
    expect(screen.getByText('het valt mee')).toBeTruthy()
  })

  it('never shows more than the total', () => {
    render(<FocusScreen title="Quiz" progress={{ current: 11, total: 10 }} onStop={() => {}}>kaart</FocusScreen>)
    expect(screen.getByText('10 / 10')).toBeTruthy()
  })

  it('calls onStop from the Stoppen button', () => {
    const onStop = vi.fn()
    render(<FocusScreen title="Quiz" onStop={onStop}>kaart</FocusScreen>)
    fireEvent.click(screen.getByText('✕ Stoppen'))
    expect(onStop).toHaveBeenCalledOnce()
  })

  it('stops the page behind it from scrolling while it is open', () => {
    const { unmount } = render(<FocusScreen title="Quiz" onStop={() => {}}>kaart</FocusScreen>)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})
