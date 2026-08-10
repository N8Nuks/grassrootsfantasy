import type { Metadata, Viewport } from 'next'
import { Oxanium, Rajdhani, Archivo, Nunito, Graduate } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

const heading = Oxanium({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-heading' })
const label = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-label' })
const wordmark = Archivo({ subsets: ['latin'], weight: 'variable', axes: ['wdth'], variable: '--font-wordmark' })
const body = Nunito({ subsets: ['latin'], variable: '--font-body' })
const numberFont = Graduate({ subsets: ['latin'], weight: '400', variable: '--font-number' })

export const metadata: Metadata = {
  title: 'Grassroots Fantasy — Play along with your favourite players',
  description: 'The fantasy league platform built for grassroots sport. Any sport, any league, any number of teams. Collect player cards, build your squad, play along with your favourite players.',
  applicationName: 'Grassroots Fantasy',
  icons: {
    icon: '/gf-logo.jpg',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Grassroots Fantasy',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Grassroots Fantasy — NFS Premier League',
    description: 'Collect the players of the NFS Premier League, build your lineup, and play along every weekend. Free to play, both grades.',
    url: 'https://www.grassrootsfantasy.co.nz',
    siteName: 'Grassroots Fantasy',
    locale: 'en_NZ',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#141210',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${heading.variable} ${label.variable} ${wordmark.variable} ${body.variable} ${numberFont.variable}`}>
      <body style={{ fontFamily: 'var(--font-body)' }}>{children}<Analytics /></body>
    </html>
  )
}