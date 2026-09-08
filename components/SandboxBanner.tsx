'use client'
import { useState, useEffect } from 'react'

/* Three countdowns in one banner: days to the sandbox closing, then to the real
   season opening, then to first pitch. All computed from the visitor's own date,
   so it moves on its own and nobody has to remember to change it. */

const CLOSE = new Date(2026, 8, 12)     // 12 September — sandbox ends
const LAUNCH = new Date(2026, 8, 18)    // 18 September — registration reopens
const FIRST_PITCH = new Date(2026, 8, 26) // 26 September — round one

const daysBetween = (from: Date, to: Date) =>
  Math.ceil((to.getTime() - from.getTime()) / 86400000)

type Phase = 'closing' | 'waiting' | 'preseason' | 'live'

export default function SandboxBanner() {
  const [n, setN] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('closing')

  useEffect(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (today < CLOSE) { setPhase('closing'); setN(daysBetween(today, CLOSE)) }
    else if (today < LAUNCH) { setPhase('waiting'); setN(daysBetween(today, LAUNCH)) }
    else if (today < FIRST_PITCH) { setPhase('preseason'); setN(daysBetween(today, FIRST_PITCH)) }
    else { setPhase('live'); setN(null) }
  }, [])

  if (phase === 'live') return null

  const copy = {
    closing: {
      eyebrow: 'Sandbox closing',
      head: 'Everyone needs to register again.',
      body: 'Every team, squad and account is being cleared so we can load the real 2026/27 rosters. Nothing carries over — you\u2019ll need to sign up again and claim your team name.',
    },
    waiting: {
      eyebrow: 'Sandbox season closed',
      head: 'The real season is here. 18 September.',
      body: 'Real 2026/27 rosters, player photos and full career details. Registration opens on the 18th — everyone starts fresh.',
    },
    preseason: {
      eyebrow: 'Registration open',
      head: 'Claim your team before first pitch.',
      body: 'Register now and your Starter Pack lands straight away. Your lineup auto-fills, so you can score from the very first round.',
    },
  }[phase]

  return (
    <div style={{
      background: 'linear-gradient(90deg, #E8983A14, #E8983A2E, #E8983A14)',
      borderBottom: '2px solid #E8983A70',
      padding: '16px 20px',
      marginTop: '64px',
    }}>
      <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap"
        style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>

        {n !== null && n >= 1 && n <= 10 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/countdown/cd-${n}.png`} alt={`${n} days`} className="shrink-0"
            style={{ height: '64px', width: 'auto', opacity: 0.9 }} />
        )}

        <div className="text-center sm:text-left" style={{ maxWidth: '460px' }}>
          <p className="font-black uppercase tracking-[0.28em]"
            style={{ color: '#E8983A', fontSize: '10px', marginBottom: '7px' }}>
            {copy.eyebrow}
          </p>
          <p className="font-black leading-tight"
            style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8', fontSize: '19px', marginBottom: '8px' }}>
            {copy.head}
          </p>
          <p className="leading-relaxed" style={{ color: '#F5E6C8', fontSize: '13px' }}>
            {copy.body}
          </p>
          <p className="leading-relaxed" style={{ color: '#F5E6C8', fontSize: '12px', marginTop: '9px' }}>
            Registration <b style={{ color: '#FFFFFF' }}>18 Sept</b> ·
            first round <b style={{ color: '#FFFFFF' }}>26 Sept</b> ·
            first scores <b style={{ color: '#FFFFFF' }}>29 Sept</b>
          </p>
        </div>
      </div>
    </div>
  )
}