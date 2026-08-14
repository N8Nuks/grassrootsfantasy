'use client'
import { useState, useEffect, useMemo } from 'react'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Line = { season: string; award: string; name: string }

export default function HonoursTicker({ grade, accent }: {
  grade: 'men' | 'women'
  accent: string
}) {
  // Every award, every season, for this grade — shuffled so it never reads the same twice
  const lines = useMemo(() => {
    const out: Line[] = []
    for (const s of HONOURS) {
      for (const [key, winner] of Object.entries(s[grade])) {
        if (!winner) continue
        out.push({ season: s.season, award: AWARD_LABELS[key] ?? key, name: winner as string })
      }
    }
    return shuffle(out)
  }, [grade])

  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (lines.length === 0) return
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % lines.length)
        setVisible(true)
      }, 380)
    }, 5000)
    return () => clearInterval(t)
  }, [lines.length])

  if (lines.length === 0) return null
  const line = lines[idx]

  return (
    <section className="relative px-5 sm:px-12 pinstripe overflow-hidden text-center"
      style={{
        background: 'radial-gradient(ellipse 80% 130% at 50% 50%, #16264C 0%, #0B1226 72%)',
        borderTop: `1px solid ${accent}55`,
        borderBottom: `1px solid ${accent}55`,
        padding: '26px 20px',
      }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 55% 90% at 50% 50%, ${accent}16 0%, transparent 72%)` }} />

      <div className="relative" style={{ maxWidth: '760px', margin: '0 auto' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em]"
          style={{ color: accent, textShadow: `0 0 14px ${accent}70` }}>
          Roll of Honour
        </p>
        <div className="transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0, minHeight: '62px', marginTop: '12px' }}>
          <p className="text-lg sm:text-2xl font-black leading-tight"
            style={{ fontFamily: 'var(--font-heading)', color: '#FFFFFF', textShadow: `0 0 20px ${accent}45` }}>
            {line.name}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em]"
            style={{ color: 'rgba(255,255,255,0.6)', marginTop: '7px' }}>
            {line.award} · {line.season}
          </p>
        </div>
      </div>
    </section>
  )
}