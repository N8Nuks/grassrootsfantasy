'use client'
import { useEffect, useRef, useState } from 'react'

/* Shown when a game is clocked. Eight seconds, skippable, and it appears every
   time — the clue has to be retrievable, not a one-shot.

   The clue lands before the halfway mark and stays pinned at the end, so a
   player who skips still reads it. */

type Props = {
  game: string
  dedication?: string
  partner?: { name: string; line: string } | null
  clue?: string | null
  onDone: () => void
}

const RUN_MS = 8000
const SKIPPABLE_AT = 1200

export default function ArcadeCredits({ game, dedication, partner, clue, onDone }: Props) {
  const [ended, setEnded] = useState(false)
  const [canSkip, setCanSkip] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    timers.current.push(setTimeout(() => setCanSkip(true), SKIPPABLE_AT))
    timers.current.push(setTimeout(() => setEnded(true), RUN_MS))
    const t = timers.current
    return () => { t.forEach(clearTimeout) }
  }, [])

  return (
    <div className="ac-wrap" role="dialog" aria-label={`${game} completed`}>
      {!ended ? (
        <div className="ac-roll">
          <p className="ac-clocked">Clocked</p>
          <h2 className="ac-game">{game}</h2>

          <p className="ac-role">An arcade by</p>
          <p className="ac-name">Black Diamond Labs</p>

          {partner && (
            <>
              <p className="ac-role">{partner.line}</p>
              <p className="ac-name">{partner.name}</p>
            </>
          )}

          <p className="ac-ded">
            {dedication ?? 'For everyone who has ever pulled on a shirt in the NFS Premier League — and for the ones who scored, umpired and drove the vans.'}
          </p>

          {clue && (
            <>
              <p className="ac-role">Dedication</p>
              <p className="ac-clue">{clue}</p>
            </>
          )}
        </div>
      ) : (
        <div className="ac-end">
          <p className="ac-clocked">Clocked</p>
          <h2 className="ac-game">{game}</h2>
          {clue && <p className="ac-clue ac-clue-end">{clue}</p>}
          <button className="ar-btn" onClick={onDone} style={{ marginTop: '20px' }}>
            <span>Continue</span>
          </button>
        </div>
      )}

      {!ended && canSkip && (
        <button className="ac-skip" onClick={() => setEnded(true)}>Skip</button>
      )}

      <style>{`
        .ac-wrap {
          position: absolute; inset: 0; overflow: hidden; z-index: 20;
          background: #05060AF7; display: flex; align-items: center; justify-content: center;
          text-align: center; padding: 20px;
        }
        .ac-roll {
          animation: ac-scroll ${RUN_MS}ms linear forwards;
        }
        @keyframes ac-scroll {
          from { transform: translateY(58%); }
          to   { transform: translateY(-58%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ac-roll { animation: none; }
        }
        .ac-clocked {
          font-size: 9px; font-weight: 900; letter-spacing: 0.4em;
          text-transform: uppercase; color: var(--neon);
        }
        .ac-game {
          font-family: var(--font-heading); font-weight: 800; text-transform: uppercase;
          font-size: clamp(24px, 7vw, 40px); line-height: 1; color: #F5F1E8;
          transform: skewX(-7deg); margin: 8px 0 26px;
        }
        .ac-role {
          font-size: 8px; font-weight: 900; letter-spacing: 0.34em;
          text-transform: uppercase; color: #4E5A6A; margin-top: 20px;
        }
        .ac-name {
          font-family: var(--font-heading); font-weight: 800;
          font-size: 15px; color: #B8C4D2; margin-top: 5px;
        }
        .ac-ded {
          font-size: 12px; line-height: 1.8; color: #7D8B9C;
          max-width: 30ch; margin: 28px auto 0;
        }
        .ac-clue {
          font-family: var(--font-heading); font-weight: 800;
          font-size: 16px; color: var(--neon); margin-top: 6px;
          text-shadow: 0 0 20px color-mix(in srgb, var(--neon) 55%, transparent);
        }
        .ac-clue-end { margin-top: 18px; font-size: 18px; }
        .ac-end { display: flex; flex-direction: column; align-items: center; }
        .ac-skip {
          position: absolute; right: 14px; bottom: 14px;
          background: transparent; border: 1px solid #ffffff20; color: #5C6878;
          font-family: var(--font-heading); font-weight: 700; font-size: 10px;
          letter-spacing: 0.22em; text-transform: uppercase;
          padding: 8px 14px; cursor: pointer;
        }
        .ac-skip:hover { border-color: #ffffff40; color: #B8C4D2; }
      `}</style>
    </div>
  )
}