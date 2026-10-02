import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatGptSelectionLink } from '../components/ChatGptSelectionLink'

const link = { x: 10, y: 10, url: 'https://chatgpt.com/?q=x', text: 'op de hoogte' }

describe('ChatGptSelectionLink', () => {
  it('hides the Fraselijst button when no onAddPhrase is given', () => {
    render(<ChatGptSelectionLink link={link} onClose={vi.fn()} />)
    expect(screen.queryByText('+ Fraselijst')).toBeNull()
  })

  it('passes the selected text to onAddPhrase and closes', () => {
    const onAddPhrase = vi.fn()
    const onClose = vi.fn()
    render(<ChatGptSelectionLink link={link} onClose={onClose} onAddPhrase={onAddPhrase} />)

    fireEvent.click(screen.getByText('+ Fraselijst'))

    expect(onAddPhrase).toHaveBeenCalledWith('op de hoogte')
    expect(onClose).toHaveBeenCalled()
  })
})
