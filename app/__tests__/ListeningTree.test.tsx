import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListeningTree } from '../components/ListeningTree'

const tree = {
  id: 'root1',
  name: '',
  files: [],
  folders: [{
    id: 'f1',
    name: 'Les 14',
    folders: [],
    files: [
      { id: 'v1', name: 'Les 14.mp4', hasSubtitles: true },
      { id: 'a1', name: 'Les 14 audio.mp3', hasSubtitles: false },
    ],
  }],
}

describe('ListeningTree', () => {
  it('shows folders and links each file to the player with its folder', () => {
    render(<ListeningTree folder={tree} />)

    expect(screen.getByText('📁 Les 14')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '🎬 Les 14.mp4' })).toHaveAttribute('href', '/luisteren-test?folder=f1&file=v1')
    expect(screen.getByRole('link', { name: '🎧 Les 14 audio.mp3' })).toHaveAttribute('href', '/luisteren-test?folder=f1&file=a1')
  })

  it('marks files that have no .srt with the same name', () => {
    render(<ListeningTree folder={tree} />)

    expect(screen.getAllByText('geen ondertitels')).toHaveLength(1)
  })
})
