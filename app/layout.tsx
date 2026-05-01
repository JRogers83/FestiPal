import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/lib/providers/query-client'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Festipals — Download 2026',
  description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
  openGraph: {
    title: 'Festipals — Download 2026',
    description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
    url: 'https://festipals.live',
    siteName: 'Festipals',
    images: [{ url: '/festipals-burst.webp', width: 1536, height: 1024, alt: 'Festipals — Download 2026' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Festipals — Download 2026',
    description: 'Build your Download Festival schedule, share it with friends, see who clashes.',
    images: ['/festipals-burst.webp'],
  },
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
