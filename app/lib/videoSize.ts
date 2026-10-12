export type VideoSize = 'klein' | 'middel' | 'groot' | 'maximaal'

export const DEFAULT_VIDEO_SIZE: VideoSize = 'groot'

// Full class strings so Tailwind can find them; `side` is the transcript column next to the video.
export const VIDEO_SIZES: Record<VideoSize, { label: string; layout: string; column: string; side: string; maxHeight: string }> = {
  klein: { label: 'Klein', layout: 'lg:flex-row', column: 'lg:w-1/3', side: 'lg:w-2/3', maxHeight: 'max-h-[40vh]' },
  middel: { label: 'Middel', layout: 'lg:flex-row', column: 'lg:w-1/2', side: 'lg:w-1/2', maxHeight: 'max-h-[55vh]' },
  groot: { label: 'Groot', layout: 'lg:flex-row', column: 'lg:w-2/3', side: 'lg:w-1/3', maxHeight: 'max-h-[70vh]' },
  maximaal: { label: 'Maximaal', layout: '', column: 'w-full', side: 'w-full', maxHeight: 'max-h-[85vh]' },
}

export function isVideoSize(value: unknown): value is VideoSize {
  return typeof value === 'string' && Object.hasOwn(VIDEO_SIZES, value)
}
