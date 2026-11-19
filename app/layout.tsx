import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'
import { THEME_INIT_SCRIPT } from './lib/theme'

export const metadata: Metadata = {
  title: 'Zeg Het Maar',
  description: 'Learn Dutch with AI feedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}