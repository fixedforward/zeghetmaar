import { useState, type ReactNode } from 'react'
import { pictureUrl } from '../lib/pictures'

type Props = { fileId: string; alt: string; className?: string; fallback?: ReactNode }

export function PhrasePicture({ fileId, alt, className = '', fallback = null }: Props) {
  const [failedId, setFailedId] = useState<string | null>(null)
  if (failedId === fileId) return <>{fallback}</>
  return (
    <img
      src={pictureUrl(fileId)}
      alt={alt}
      onError={() => setFailedId(fileId)}
      className={`max-h-48 max-w-full rounded object-contain ${className}`}
    />
  )
}

export const NO_PICTURE_TEXT = 'Geen afbeelding beschikbaar'

const noPicture = <p className="text-xs text-gray-400 italic">{NO_PICTURE_TEXT}</p>

// A meaning's picture, or a placeholder line when it has none (or the image fails to load).
export function MeaningPicture({ fileId, alt, loading = false, className }: { fileId?: string; alt: string; loading?: boolean; className?: string }) {
  if (loading) return null
  return fileId ? <PhrasePicture fileId={fileId} alt={alt} className={className} fallback={noPicture} /> : noPicture
}
