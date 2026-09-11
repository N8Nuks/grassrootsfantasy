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
      /* The label sits under the number, so it has to say what the number is
         counting down to — it changes with the phase. */
      unit: (d: number) => d === 1 ? 'Day until close' : 'Days until close',
      head: 'Everyone needs to register again.',
      body: 'Every team, squad and account is being cleared so we can load the real 2026/27 rosters. Nothing carries over — you\u2019ll need to sign up again and claim your team name.',
    },
    waiting: {
      eyebrow: 'Sandbox season closed',
      unit: (d: number) => d === 1 ? 'Day until relaunch' : 'Days until relaunch',
      head: 'The real season is here. 18 September.',
      body: 'Real 2026/27 rosters, player photos and full career details. Registration opens on the 18th — everyone starts fresh.',
    },
    preseason: {
      eyebrow: 'Registration open',
      unit: (d: number) => d === 1 ? 'Day to first pitch' : 'Days to first pitch',
      head: 'Claim your team before first pitch.',
      body: 'Register now and your Starter Pack lands straight away. Your lineup auto-fills, so you can score from the very first round.',
    },
  }[phase]

  return (
    <div className="sb-banner">
      {/* The artwork carries the spray; the streaks stay in CSS so they can
          glow and drift, which a flat image can't. Both sit under a scrim —
          the art is busy enough that copy over it raw would be unreadable. */}
      <span className="sb-art" aria-hidden="true" />
      <span className="sb-streaks" aria-hidden="true" />
      <span className="sb-scrim" aria-hidden="true" />

      <div className="sb-inner flex items-center justify-center gap-5 sm:gap-8 flex-wrap">

        {n !== null && n >= 1 && n <= 10 && (
          <div className="shrink-0 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sb-num" src={`/countdown/cd-${n}.png`} alt=""
              style={{ height: '64px', width: 'auto' }} />
            <span className="sb-unit font-black uppercase tracking-[0.3em]">
              {copy.unit(n)}
            </span>
          </div>
        )}

        <div className="text-center sm:text-left" style={{ maxWidth: '460px' }}>
          <p className="sb-eyebrow font-black uppercase tracking-[0.28em]">
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

      <style>{`
        .sb-banner {
          position: relative;
          overflow: hidden;
          background: #0A0B12;
          border-bottom: 2px solid #E8983A70;
          padding: 20px;
          margin-top: 64px;
          isolation: isolate;
        }

        .sb-art {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 0;
          background: url('/banner-neon.webp') center / cover no-repeat;
          opacity: 0.42;
        }

        /* Thin bright cores with a bloom either side, raked across. The drift is
           slow enough that you only notice it if you look. */
        .sb-streaks {
          position: absolute; inset: -40% -10%;
          pointer-events: none; z-index: 1;
          mix-blend-mode: screen; opacity: 0.5;
          background:
            linear-gradient(101deg, transparent 27.4%, #C6FF0000 27.6%, #C6FF00 27.9%, #C6FF0000 28.2%, transparent 28.4%),
            linear-gradient(101deg, transparent 51.4%, #FF2D9500 51.6%, #FF2D95 51.9%, #FF2D9500 52.2%, transparent 52.4%),
            linear-gradient(101deg, transparent 68.4%, #00F0FF00 68.6%, #00F0FF 68.9%, #00F0FF00 69.2%, transparent 69.4%),
            linear-gradient(101deg, transparent 84.4%, #39FF9E00 84.6%, #39FF9E 84.9%, #39FF9E00 85.2%, transparent 85.4%);
          filter: blur(0.6px);
          animation: sb-drift 26s linear infinite alternate;
        }
        @keyframes sb-drift {
          from { transform: translateX(-2%); }
          to   { transform: translateX(2%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-streaks { animation: none; }
        }

        /* Darkest through the middle where the copy sits, lighter at the edges
           so the artwork still shows. */
        .sb-scrim {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 2;
          background:
            linear-gradient(90deg, #0A0B1266 0%, #0A0B12D9 22%, #0A0B12E6 50%, #0A0B12D9 78%, #0A0B1266 100%);
        }

        .sb-inner {
          position: relative; z-index: 3;
          max-width: 760px; margin-left: auto; margin-right: auto;
          text-shadow: 0 2px 16px #0A0B12, 0 0 30px #0A0B12;
        }

        .sb-num { filter: drop-shadow(0 0 18px #E8983A80); }

        .sb-unit {
          color: #FFC46B; font-size: 9px; margin-top: 4px;
          text-shadow: 0 0 12px #E8983A90;
        }
        .sb-eyebrow {
          color: #FFC46B; font-size: 10px; margin-bottom: 7px;
          text-shadow: 0 0 14px #E8983A90;
        }
      `}</style>
    </div>
  )
}