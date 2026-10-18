'use client'
import { useEffect, useState } from 'react'
import { splitName } from '@/lib/names'

type Top = { id: string; name: string; club: string; points: number }
type Data = { round: { number: number; status: string } | null; top: Top[] }

/* Sits in the Collection view: who scored this round, and the way to the
   full board. Renders nothing until the round is scored. */
export default function LeadersStrip({ grade, accent, text, textDim, surface }: {
  grade: 'mens' | 'womens'
  accent: string
  text: string
  textDim: string
  surface: string
}) {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/leaders-strip?grade=${grade}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: Data) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [grade])

  // Held back until mid-week, then it shows itself
  if (Date.now() < new Date('2026-10-21T17:00:00+13:00').getTime()) return null
  if (!data?.round || data.top.length === 0) return null

  return (
    <a href={`/leaders?grade=${grade}&view=round`}
      className="block rounded-2xl overflow-hidden transition-colors hover:bg-white/5"
      style={{ background: surface, border: `1px solid ${accent}30`, marginBottom: '28px', textDecoration: 'none' }}>
      <div className="flex items-center justify-between gap-3" style={{ padding: '12px 18px', borderBottom: `1px solid ${accent}20` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: accent }}>
          League Leaders · Round {data.round.number}{data.round.status === 'provisional' ? ' · Provisional' : ''}
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: textDim }}>
          Full board →
        </span>
      </div>
      {data.top.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3" style={{ padding: '9px 18px', borderBottom: i < data.top.length - 1 ? '1px solid #ffffff08' : 'none' }}>
          <span className="w-5 text-sm font-black shrink-0" style={{ color: i === 0 ? '#FFD700' : textDim }}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: text }}>
              {splitName(p.name).first} <span className="uppercase">{splitName(p.name).last}</span>
            </p>
            <p className="text-[10px] truncate" style={{ color: textDim }}>{p.club}</p>
          </div>
          <span className="text-base font-black shrink-0" style={{ fontFamily: 'var(--font-heading)', color: i === 0 ? '#FFD700' : text }}>
            {p.points}
          </span>
        </div>
      ))}
    </a>
  )
}