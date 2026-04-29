import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers/query-client'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Festipals — Download 2026',
  description: 'Plan your Download Festival schedule with friends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
