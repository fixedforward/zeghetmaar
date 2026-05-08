import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nederlandse Herschrijver',
  description: 'Learn Dutch with AI feedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}