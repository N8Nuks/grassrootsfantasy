import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Grassroots Fantasy — NFS Edition | Built for the game you love',
  description: 'The free fantasy league for the Northern Fastpitch Series. Collect player cards, build your squad, score points from real game results. Endorsed by the Auckland Softball Association.',
  icons: { icon: '/gf-logo.jpg' },
  openGraph: {
    title: 'Grassroots Fantasy — NFS Edition',
    description: 'Built for the game you love. The free fantasy league for the Northern Fastpitch Series.',
    url: 'https://grassrootsfantasy.co.nz',
    siteName: 'Grassroots Fantasy',
    locale: 'en_NZ',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
