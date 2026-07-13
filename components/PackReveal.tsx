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
  elite: { label: 'ELITE', accent: '#4DA6FF', announce: 'Elite' },
  common: { label: 'COMMON', accent: '#2D9E4E', announce: 'Common' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

// Reveal order: Commons first, building to the 2WP A finale
const REVEAL_ORDER = ['common', 'elite', 'rare_2wp_b', 'rare_2wp_a']

// Fuse per tier: green steady opener, electric-fast Elites, gold slow-burn Rares
const FUSE: Record<string, { color: string; ms: number }> = {
  common: { color: '#2D9E4E', ms: 1100 },
  elite: { color: '#4DA6FF', ms: 650 },
  rare_2wp_b: { color: '#FFD700', ms: 1500 },
  rare_2wp_a: { color: '#FFD700', ms: 1500 },
}

type Stage = 'pack' | 'tearing' | 'igniter' | 'fuse' | 'front' | 'summary'

export default function PackReveal({ grade, packName, cards, onDone }: {
  grade: Grade
  packName: string
  cards: RevealCard[]
  onDone: () => void
}) {
  const T = theme(grade)
  const sorted = [...cards].sort((a, b) => REVEAL_ORDER.indexOf(a.tier) - REVEAL_ORDER.indexOf(b.tier))

  const [stage, setStage] = useState<Stage>('pack')
  const [idx, setIdx] = useState(0)

  const current = sorted[idx]
  const meta = current ? (TIER_META[current.tier] ?? TIER_META.common) : TIER_META.common
  const isRare = current?.tier.startsWith('rare')
  const fuse = FUSE[current?.tier ?? 'common'] ?? FUSE.common

  function runFuse(nextIdx: number) {
    setIdx(nextIdx)
    setStage('fuse')
    const f = FUSE[sorted[nextIdx].tier] ?? FUSE.common
    setTimeout(() => setStage('front'), f.ms + 150)
  }

  function advance() {
    if (stage === 'pack') {
      setStage('tearing')
      setTimeout(() => setStage('igniter'), 460)
      return
    }
    if (stage === 'igniter') {
      runFuse(0)
      return
    }
    if (stage === 'front') {
      const next = idx + 1
      if (next >= sorted.length) { setStage('summary'); return }
      if (sorted[next].tier !== 'common') {
        runFuse(next)          // tier moment: fuse ritual
      } else {
        setIdx(next)           // common after common: instant flip
        setStage('front')
      }
      return
    }
    if (stage === 'summary') onDone()
  }

  const cardBack = 'linear-gradient(180deg, #132B52 0%, #0F2242 45%, #08162E 100%)'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 cursor-pointer select-none"
      style={{ background: '#000000E8', backdropFilter: 'blur(6px)' }}
      onClick={advance}>
      <div className="w-full text-center flex flex-col items-center" style={{ maxWidth: '400px', perspective: '900px' }}>

        {/* Stage 1 — the unopened pack */}
        {(stage === 'pack' || stage === 'tearing') && (
          <div className={stage === 'tearing' ? '' : 'gf-pop'}>
            <div className={`relative mx-auto rounded-2xl pinstripe flex flex-col items-center justify-center ${stage === 'tearing' ? 'gf-tear' : 'gf-wiggle'}`}
              style={{ width: '240px', height: '340px', background: `linear-gradient(160deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `2px solid ${T.accent}`, boxShadow: `0 0 48px ${T.accent}40` }}>
              <p className="text-xs font-black uppercase tracking-[0.35em] mb-3" style={{ color: T.accent }}>Grassroots</p>
              <p className="text-2xl font-black uppercase" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{packName}</p>
              <p className="text-sm font-bold mt-2" style={{ color: T.textDim }}>{sorted.length} cards</p>
              <div className="absolute left-3 right-3" style={{ top: '46px', borderTop: `2px dashed ${T.accent}50` }} />
            </div>
            {stage === 'pack' && <p className="text-xs font-bold uppercase tracking-[0.3em] mt-8 gf-pulse" style={{ color: T.text }}>Tap to tear open</p>}
          </div>
        )}

        {/* Stage 2 — card back (igniter waits for tap; fuse burns) */}
        {(stage === 'igniter' || stage === 'fuse') && (
          <div key={`back-${idx}`} className={stage === 'igniter' ? 'gf-pop' : ''}>
            <div className="relative rounded-2xl flex flex-col items-center justify-center"
              style={{ width: '250px', height: '360px', margin: '0 auto', background: cardBack, border: '2px solid #F5F1E820' }}>
              {/* GF logo — native on its own background */}
              <div className="overflow-hidden flex items-center justify-center"
                style={{ width: '130px', height: '130px', filter: stage === 'igniter' ? `drop-shadow(0 0 18px ${T.accent}50)` : 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] mt-5" style={{ color: '#F5F1E860' }}>Grassroots Fantasy</p>
              <p className="text-xs font-bold mt-1" style={{ color: '#F5F1E860' }}>Card {idx + 1} of {sorted.length}</p>

              {stage === 'fuse' && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 250 360" fill="none" style={{ overflow: 'visible' }}>
                  <rect x="3" y="3" width="244" height="354" rx="14" pathLength={100}
                    stroke={fuse.color} strokeWidth="3.5" strokeLinecap="round"
                    className="gf-fuse"
                    style={{ animationDuration: `${fuse.ms}ms`, filter: `drop-shadow(0 0 6px ${fuse.color}) drop-shadow(0 0 14px ${fuse.color})` }} />
                </svg>
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] mt-8" style={{ color: stage === 'igniter' ? T.text : fuse.color }}>
              {stage === 'igniter' ? <span className="gf-pulse inline-block">Tap the logo to light the fuse</span> : '· · ·'}
            </p>
          </div>
        )}

        {/* Stage 3 — the revealed card */}
        {stage === 'front' && current && (
          <div key={`front-${idx}`}>
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-5 gf-pop"
              style={{ color: meta.accent, textShadow: isRare ? `0 0 16px ${meta.accent}` : undefined }}>
              {meta.announce}
            </p>
            <div className="gf-flip-in" style={{ width: '250px', margin: '0 auto' }}>
              <div className="relative rounded-2xl overflow-hidden flex flex-col gf-wiggle"
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
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] mt-7" style={{ color: T.textDim }}>
              {idx + 1 < sorted.length ? 'Tap for the next card' : 'Tap to see your haul'}
            </p>
          </div>
        )}

        {/* Stage 4 — summary */}
        {stage === 'summary' && (
          <div className="gf-pop w-full">
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-6" style={{ color: T.accent }}>Added to your collection</p>
            <div className="flex flex-col gap-2 mb-8">
              {sorted.map((c, i) => {
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