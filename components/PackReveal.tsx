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

type Stage = 'pack' | 'tearing' | 'back' | 'fuse' | 'front' | 'summary'

export default function PackReveal({ grade, packName, cards, onDone }: {
  grade: Grade
  packName: string
  cards: RevealCard[]
  onDone: () => void
}) {
  const T = theme(grade)
  const [stage, setStage] = useState<Stage>('pack')
  const [idx, setIdx] = useState(0)

  const current = cards[idx]
  const meta = current ? (TIER_META[current.tier] ?? TIER_META.common) : TIER_META.common
  const isRare = current?.tier.startsWith('rare')
  // The fuse is the tell: gold and fast means a Rare is coming
  const fuseColor = isRare ? '#FFD700' : T.accent
  const fuseMs = isRare ? 750 : 1300

  function advance() {
    if (stage === 'pack') {
      setStage('tearing')
      setTimeout(() => setStage('back'), 460)
      return
    }
    if (stage === 'back') {
      setStage('fuse')
      setTimeout(() => setStage('front'), fuseMs + 150)
      return
    }
    if (stage === 'front') {
      if (idx + 1 >= cards.length) { setStage('summary'); return }
      setIdx(i => i + 1)
      setStage('back')
      return
    }
    if (stage === 'summary') onDone()
  }

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
              <p className="text-sm font-bold mt-2" style={{ color: T.textDim }}>{cards.length} cards</p>
              <div className="absolute left-3 right-3" style={{ top: '46px', borderTop: `2px dashed ${T.accent}50` }} />
            </div>
            {stage === 'pack' && <p className="text-xs font-bold uppercase tracking-[0.3em] mt-8 gf-pulse" style={{ color: T.text }}>Tap to tear open</p>}
          </div>
        )}

        {/* Stage 2 — card back with fuse */}
        {(stage === 'back' || stage === 'fuse') && (
          <div key={`back-${idx}`} className={stage === 'back' ? 'gf-pop' : ''}>
            <div className="relative mx-auto rounded-2xl pinstripe flex flex-col items-center justify-center"
              style={{ width: '250px', height: '360px', background: '#0F2242', border: '3px solid #F5F1E825' }}>
              {/* GF logo — the igniter */}
              .<div className="overflow-hidden flex items-center justify-center"
                style={{ width: '120px', height: '120px', boxShadow: stage === 'back' ? `0 0 28px ${T.accent}35` : 'none' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] mt-5" style={{ color: T.textDim }}>Grassroots Fantasy</p>
              <p className="text-xs font-bold mt-1" style={{ color: T.textDim }}>Card {idx + 1} of {cards.length}</p>

              {/* LED fuse — traces the border on ignition */}
              {stage === 'fuse' && (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 250 360" fill="none" style={{ overflow: 'visible' }}>
                  <rect x="3" y="3" width="244" height="354" rx="14" pathLength={100}
                    stroke={fuseColor} strokeWidth="3.5" strokeLinecap="round"
                    className="gf-fuse"
                    style={{ animationDuration: `${fuseMs}ms`, filter: `drop-shadow(0 0 6px ${fuseColor}) drop-shadow(0 0 14px ${fuseColor})` }} />
                </svg>
              )}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] mt-8" style={{ color: stage === 'back' ? T.text : fuseColor }}>
              {stage === 'back' ? <span className="gf-pulse inline-block">Tap the logo to light the fuse</span> : '· · ·'}
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
              {idx + 1 < cards.length ? 'Tap for the next card' : 'Tap to see your haul'}
            </p>
          </div>
        )}

        {/* Stage 4 — summary */}
        {stage === 'summary' && (
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