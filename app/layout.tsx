import type { Metadata, Viewport } from 'next'
import { Oxanium, Rajdhani, Archivo, Nunito, Graduate } from 'next/font/google'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import InstallPrompt from '@/components/InstallPrompt'

const heading = Oxanium({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-heading' })
const label = Rajdhani({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-label' })
const wordmark = Archivo({ subsets: ['latin'], weight: 'variable', axes: ['wdth'], variable: '--font-wordmark' })
const body = Nunito({ subsets: ['latin'], variable: '--font-body' })
const numberFont = Graduate({ subsets: ['latin'], weight: '400', variable: '--font-number' })

// Apple splash screens — device width, height, and orientation
const SPLASH: [number, number][] = [
  [1179, 2556], [1290, 2796], [1170, 2532], [1284, 2778], [1125, 2436],
  [1242, 2688], [828, 1792], [750, 1334], [1242, 2208],
  [1536, 2048], [1668, 2224], [1668, 2388], [2048, 2732],
]

export const metadata: Metadata = {
  title: 'Grassroots Fantasy — Play along with your favourite players',
  description: 'The fantasy league platform built for grassroots sport. Any sport, any league, any number of teams. Collect player cards, build your squad, play along with your favourite players.',
  applicationName: 'Grassroots Fantasy',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Grassroots Fantasy',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
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
  themeColor: '#0D162E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${heading.variable} ${label.variable} ${wordmark.variable} ${body.variable} ${numberFont.variable}`}>
      <head>
        {SPLASH.flatMap(([w, h]) => [
          <link key={`p-${w}x${h}`} rel="apple-touch-startup-image"
            media={`(device-width: ${Math.round(w / 3)}px) and (device-height: ${Math.round(h / 3)}px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)`}
            href={`/splash/splash-${w}x${h}.png`} />,
          <link key={`l-${w}x${h}`} rel="apple-touch-startup-image"
            media={`(device-width: ${Math.round(w / 3)}px) and (device-height: ${Math.round(h / 3)}px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)`}
            href={`/splash/splash-${h}x${w}.png`} />,
        ])}
      </head>
      <body style={{ fontFamily: 'var(--font-body)' }}>
        {children}
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}