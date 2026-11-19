import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LuisterenTab } from '../components/LuisterenTab'
import { saveLastVideo } from '../hooks/useLastVideo'

function renderTab() {
  render(
    <LuisterenTab
      isLoggedIn
      listeningTree={{ tree: null, loading: false, error: null, loadTree: vi.fn() }}
      tracker={{ practicedDates: new Set<string>(), onCheckIn: vi.fn(), onCancelCheckIn: vi.fn() }}
    />,
  )
}

describe('LuisterenTab', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('links to the player for the last video I watched', () => {
    saveLastVideo({ folderId: 'f1', fileId: 'v1', name: 'Les 3.mp4' })
    renderTab()

    const link = screen.getByText('▶ Verder kijken: Les 3.mp4').closest('a')
    expect(link?.getAttribute('href')).toBe('/luisteren-test?folder=f1&file=v1')
  })

  it('has no Verder kijken button before any video was watched', () => {
    renderTab()
    expect(screen.queryByText(/Verder kijken/)).toBeNull()
  })
})
