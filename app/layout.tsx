import type { Metadata } from 'next'
import { Bricolage_Grotesque, Nunito } from 'next/font/google'
import './globals.css'

const heading = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-heading' })
const body = Nunito({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'Grassroots Fantasy — Play along with your favourite players',
  description: 'The fantasy league platform built for grassroots sport. Any sport, any league, any number of teams. Collect player cards, build your squad, play along with your favourite players.',
  icons: { icon: '/gf-logo.jpg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body style={{ fontFamily: 'var(--font-body)' }}>{children}</body>
    </html>
  )
}
