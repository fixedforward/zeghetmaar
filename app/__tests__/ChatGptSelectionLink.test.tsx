import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { openChatGptWithPromptAsyncMock } = vi.hoisted(() => ({ openChatGptWithPromptAsyncMock: vi.fn() }))
vi.mock('../lib/chatgpt', () => ({ openChatGptWithPromptAsync: openChatGptWithPromptAsyncMock }))

import { ChatGptSelectionLink } from '../components/ChatGptSelectionLink'

const link = { x: 10, y: 10, prompt: 'Leg uit: "op de hoogte"', text: 'op de hoogte' }

describe('ChatGptSelectionLink', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

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

  it('opens ChatGPT with the prompt and closes when it fits in the URL', async () => {
    openChatGptWithPromptAsyncMock.mockResolvedValue('url')
    const onClose = vi.fn()
    render(<ChatGptSelectionLink link={link} onClose={onClose} />)

    fireEvent.click(screen.getByText('Open in ChatGPT'))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(openChatGptWithPromptAsyncMock).toHaveBeenCalledWith('Leg uit: "op de hoogte"')
  })

  it('stays open with a paste hint when the prompt went to the clipboard', async () => {
    openChatGptWithPromptAsyncMock.mockResolvedValue('clipboard')
    const onClose = vi.fn()
    render(<ChatGptSelectionLink link={link} onClose={onClose} />)

    fireEvent.click(screen.getByText('Open in ChatGPT'))

    expect(await screen.findByText('Vraag + hele tekst gekopieerd. Plak in ChatGPT met ⌘V.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the buttons again for a new selection after a copy', async () => {
    openChatGptWithPromptAsyncMock.mockResolvedValue('clipboard')
    const { rerender } = render(<ChatGptSelectionLink link={link} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Open in ChatGPT'))
    await screen.findByText(/gekopieerd/)

    rerender(<ChatGptSelectionLink link={{ ...link, text: 'iets anders' }} onClose={vi.fn()} />)

    expect(screen.getByText('Open in ChatGPT')).toBeInTheDocument()
  })
})
