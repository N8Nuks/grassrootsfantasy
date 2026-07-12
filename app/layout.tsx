import type { Metadata } from 'next'
import { Oxanium, Rajdhani, Archivo, Nunito } from 'next/font/google'
import './globals.css'

const heading = Oxanium({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-heading' })
const label = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-label' })
const wordmark = Archivo({ subsets: ['latin'], weight: 'variable', axes: ['wdth'], variable: '--font-wordmark' })
const body = Nunito({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Grassroots Fantasy — Play along with your favourite players',
  description: 'The fantasy league platform built for grassroots sport. Any sport, any league, any number of teams. Collect player cards, build your squad, play along with your favourite players.',
  icons: { icon: '/gf-logo.jpg' },
  manifest: '/manifest.json',
  themeColor: '#141210',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${label.variable} ${wordmark.variable} ${body.variable}`}>
      <body style={{ fontFamily: 'var(--font-body)' }}>{children}</body>
    </html>
  )
}
