import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PhrasePicture } from '../components/PhrasePicture'

describe('PhrasePicture', () => {
  it('shows the picture from the pictures API', () => {
    render(<PhrasePicture fileId="p1" alt="fiets" />)

    expect(screen.getByAltText('fiets').getAttribute('src')).toBe('/api/pictures/p1')
  })

  it('shows the fallback when the picture fails to load', () => {
    render(<PhrasePicture fileId="p1" alt="fiets" fallback={<p>Geen afbeelding beschikbaar</p>} />)

    fireEvent.error(screen.getByAltText('fiets'))

    expect(screen.queryByAltText('fiets')).toBeNull()
    expect(screen.getByText('Geen afbeelding beschikbaar')).toBeTruthy()
  })

  it('shows nothing when it fails without a fallback', () => {
    const { container } = render(<PhrasePicture fileId="p1" alt="fiets" />)

    fireEvent.error(screen.getByAltText('fiets'))

    expect(container.innerHTML).toBe('')
  })
})
