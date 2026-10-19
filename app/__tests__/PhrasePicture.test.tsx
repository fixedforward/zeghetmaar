import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MeaningPicture, NO_PICTURE_TEXT, PhrasePicture } from '../components/PhrasePicture'

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

describe('MeaningPicture', () => {
  it('shows a placeholder line when the meaning has no picture', () => {
    render(<MeaningPicture alt="bank — shore" />)

    expect(screen.getByText(NO_PICTURE_TEXT)).toBeTruthy()
  })

  it('shows the placeholder when the picture fails to load', () => {
    render(<MeaningPicture fileId="p1" alt="bank — bench" />)

    fireEvent.error(screen.getByAltText('bank — bench'))

    expect(screen.getByText(NO_PICTURE_TEXT)).toBeTruthy()
  })

  it('shows nothing while the pictures are still loading', () => {
    const { container } = render(<MeaningPicture alt="bank" loading />)

    expect(container.innerHTML).toBe('')
  })
})
