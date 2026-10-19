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
