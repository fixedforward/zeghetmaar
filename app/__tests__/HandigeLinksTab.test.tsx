import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { HandigeLinksTab } from '../components/HandigeLinksTab'

const link = { id: 'u1', title: 'NT2 schrijven', url: 'https://docs.google.com/document/d/abc/edit', createdAt: '2026-01-01T00:00:00.000Z' }

function renderTab(isLoggedIn = true) {
  const props = {
    links: [link],
    loading: false,
    saving: false,
    error: null,
    loadLinks: vi.fn(),
    addLinkAsync: vi.fn().mockResolvedValue(true),
    setTitleAsync: vi.fn().mockResolvedValue(true),
    setUrlAsync: vi.fn().mockResolvedValue(true),
    deleteLinkAsync: vi.fn().mockResolvedValue(true),
  }
  render(<HandigeLinksTab {...props} isLoggedIn={isLoggedIn} />)
  return props
}

describe('HandigeLinksTab', () => {
  it('asks to log in and loads nothing when logged out', () => {
    const props = renderTab(false)

    expect(screen.getByText('Log in om je handige links te zien.')).toBeTruthy()
    expect(props.loadLinks).not.toHaveBeenCalled()
  })

  it('loads the links and shows each one as a link that opens in a new tab', () => {
    const props = renderTab()

    expect(props.loadLinks).toHaveBeenCalled()
    const anchor = screen.getByRole('link', { name: 'NT2 schrijven' })
    expect(anchor.getAttribute('href')).toBe(link.url)
    expect(anchor.getAttribute('target')).toBe('_blank')
  })

  it('adds a link and clears the form', async () => {
    const props = renderTab()

    fireEvent.change(screen.getByPlaceholderText('Naam (optioneel)'), { target: { value: ' Van Dale ' } })
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://vandale.nl ' } })
    fireEvent.click(screen.getByText('Toevoegen'))

    expect(props.addLinkAsync).toHaveBeenCalledWith('Van Dale', 'https://vandale.nl')
    await waitFor(() => expect((screen.getByPlaceholderText('https://...') as HTMLInputElement).value).toBe(''))
  })

  it('edits the name of a link', () => {
    const props = renderTab()

    fireEvent.click(screen.getByText('Bewerken'))
    const nameSection = screen.getByText('Naam').parentElement as HTMLElement
    fireEvent.click(within(nameSection).getByText('Bewerken'))
    const field = within(nameSection).getByRole('textbox')
    fireEvent.change(field, { target: { value: 'Schrijfopdrachten' } })
    fireEvent.keyDown(field, { key: 'Enter' })

    expect(props.setTitleAsync).toHaveBeenCalledWith('u1', 'Schrijfopdrachten')
  })

  it('deletes a link after confirming', () => {
    const props = renderTab()

    fireEvent.click(screen.getByText('✕ Verwijderen'))
    fireEvent.click(screen.getByText('Ja'))

    expect(props.deleteLinkAsync).toHaveBeenCalledWith('u1')
  })
})
