import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CardScratchField } from '../components/CardScratchField'

describe('CardScratchField', () => {
  it('lets me type, and Enter flips the card', () => {
    const onReveal = vi.fn()
    render(<CardScratchField revealed={false} onReveal={onReveal} />)
    const field = screen.getByRole('textbox')

    fireEvent.change(field, { target: { value: 'de fiets' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect((field as HTMLTextAreaElement).value).toBe('de fiets')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('Shift+Enter does not flip the card', () => {
    const onReveal = vi.fn()
    render(<CardScratchField revealed={false} onReveal={onReveal} />)

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true })

    expect(onReveal).not.toHaveBeenCalled()
  })

  it('keeps what I typed, read-only, once the card is flipped', () => {
    const { rerender } = render(<CardScratchField revealed={false} onReveal={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fiets' } })

    rerender(<CardScratchField revealed onReveal={() => {}} />)

    const field = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(field.value).toBe('fiets')
    expect(field.readOnly).toBe(true)
  })
})
