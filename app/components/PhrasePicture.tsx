import { useState } from 'react'
import { pictureUrl } from '../lib/pictures'

type Props = { fileId: string; alt: string; className?: string }

export function PhrasePicture({ fileId, alt, className = '' }: Props) {
  const [failedId, setFailedId] = useState<string | null>(null)
  if (failedId === fileId) return null
  return (
    <img
      src={pictureUrl(fileId)}
      alt={alt}
      onError={() => setFailedId(fileId)}
      className={`max-h-48 max-w-full rounded object-contain ${className}`}
    />
  )
}
