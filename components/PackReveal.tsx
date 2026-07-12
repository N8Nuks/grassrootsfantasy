'use client'
import { useState } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'

export type RevealCard = {
  name: string
  tier: string
  club?: string
  positions?: string[]
}

const TIER_META: Record<string, { label: string; accent: string; announce: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700', announce: 'RARE PULL!' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A', announce: 'RARE PULL!' },
  elite: { label: 'ELITE', accent: '#C0C0C0', announce: 'Elite' },
  common: { label: 'COMMON', accent: '#2D9E4E', announce: 'Common' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

export default function PackReveal({ grade, packName, cards, onDone }: {
  grade: Grade
  packName: string
  cards: RevealCard[]
  onDone: () => void
}) {
  const T = theme(grade)
  // idx: -1 = unopened pack, 0..n-1 = revealing card, n = summary
  const [idx, setIdx] = useState(-1)
  const done = idx >= cards.length
  const current = idx >= 0 && idx < cards.length ? cards[idx] : null
  const meta = current ? (TIER_META[current.tier] ?? TIER_META.common) : null
  const isRare = current?.tier.startsWith('rare')

  function advance() {
    if (done) { onDone(); return }
    setIdx(i => i + 1)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 cursor-pointer select-none"
      style={{ background: '#000000E8', backdropFilter: 'blur(6px)' }}
      onClick={advance}>
      <div className="w-full text-center" style={{ maxWidth: '400px' }}>

        {/* Stage 1 — the unopened pack */}
        {idx === -1 && (
          <div className="gf-pop">
            <div className="relative mx-auto rounded-2xl pinstripe flex flex-col items-center justify-center"
              style={{ width: '240px', height: '340px', background: `linear-gradient(160deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `2px solid ${T.accent}`, boxShadow: `0 0 48px ${T.accent}40` }}>
              <p className="text-xs font-black uppercase tracking-[0.35em] mb-3" style={{ color: T.accent }}>Grassroots</p>
              <p className="text-2xl font-black uppercase" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{packName}</p>
              <p className="text-sm font-bold mt-2" style={{ color: T.textDim }}>{cards.length} cards</p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] mt-8 gf-pulse" style={{ color: T.text }}>Tap to tear open</p>
          </div>
        )}

        {/* Stage 2 — card by card */}
        {current && meta && (
          <div key={idx} className="gf-pop">
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-5"
              style={{ color: meta.accent, textShadow: isRare ? `0 0 16px ${meta.accent}` : undefined }}>
              {meta.announce}
            </p>
            <div className="relative mx-auto rounded-2xl overflow-hidden flex flex-col"
              style={{
                width: '250px', height: '360px',
                background: T.surface,
                border: `2px solid ${meta.accent}`,
                boxShadow: isRare ? `0 0 64px ${meta.accent}70, 0 0 120px ${meta.accent}30` : `0 0 28px ${meta.accent}30`,
              }}>
              <div className="flex-1 relative flex items-end justify-center"
                style={{ background: `linear-gradient(180deg, ${meta.accent}35 0%, ${T.surface} 95%)` }}>
                <svg width="52%" viewBox="0 0 60 80" fill="none">
                  <circle cx="30" cy="22" r="13" fill={meta.accent + '80'} />
                  <path d="M6 80 C6 52 54 52 54 80 Z" fill={meta.accent + '80'} />
                </svg>
                <span className="absolute top-3 left-3.5 text-[10px] font-black tracking-widest"
                  style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}90` }}>{meta.label}</span>
              </div>
              <div className="text-left" style={{ background: T.headerBg, borderTop: `1px solid ${meta.accent}40`, padding: '12px 16px 14px' }}>
                <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{current.name}</p>
                <p className="text-[11px] font-bold" style={{ color: T.textDim }}>
                  {current.club ?? ''}{current.club && current.positions?.length ? ' · ' : ''}{(current.positions ?? []).map(posLabel).join(' ')}
                </p>
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] mt-7" style={{ color: T.textDim }}>
              {idx + 1} of {cards.length} · tap for next
            </p>
          </div>
        )}

        {/* Stage 3 — summary */}
        {done && (
          <div className="gf-pop">
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-6" style={{ color: T.accent }}>Added to your collection</p>
            <div className="flex flex-col gap-2 mb-8">
              {cards.map((c, i) => {
                const m = TIER_META[c.tier] ?? TIER_META.common
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl text-left" style={{ background: T.surface, border: `1px solid ${m.accent}40`, padding: '12px 18px' }}>
                    <span className="text-[9px] font-black tracking-widest w-14 shrink-0" style={{ color: m.accent, textShadow: `0 0 8px ${m.accent}70` }}>{m.label}</span>
                    <span className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{c.name}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] gf-pulse" style={{ color: T.text }}>Tap to finish</p>
          </div>
        )}
      </div>
    </div>
  )
}