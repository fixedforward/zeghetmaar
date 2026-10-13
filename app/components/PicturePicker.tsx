import { useEffect } from 'react'
import { usePictures } from '../hooks/usePictures'
import { findPictureForPhrase } from '../lib/pictures'
import { PhrasePicture } from './PhrasePicture'

type Props = {
  phrase: string
  value: string | null
  onChange: (fileId: string | null) => void
}

export function PicturePicker({ phrase, value, onChange }: Props) {
  const { pictures, loading, error } = usePictures(!value)
  const suggestion = value ? undefined : findPictureForPhrase(pictures, phrase)
  const fileId = value ?? suggestion?.id

  useEffect(() => {
    if (suggestion) onChange(suggestion.id)
  }, [suggestion, onChange])

  return (
    <div className="space-y-2">
      {fileId ? (
        <PhrasePicture fileId={fileId} alt={phrase} />
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-sm text-gray-500 italic">{loading ? 'Afbeeldingen laden...' : 'Geen afbeelding.'}</p>
      )}
    </div>
  )
}
