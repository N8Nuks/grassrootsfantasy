'use client'
import { useState } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'

export type RevealCard = {
  name: string
  tier: string
  club?: string
  positions?: string[]
}

const TIER_META: Record<string, { label: string; word: string; accent: string; announce: string }> = {
  rare_2wp_a: { label: '2WP A', word: 'RARE', accent: '#FFD700', announce: 'RARE PULL!' },
  rare_2wp_b: { label: '2WP B', word: 'RARE', accent: '#E8C15A', announce: 'RARE PULL!' },
  elite: { label: 'ELITE', word: 'ELITE', accent: '#4DA6FF', announce: 'Elite' },
  common: { label: 'COMMON', word: 'COMMON', accent: '#2D9E4E', announce: 'Common' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p

const REVEAL_ORDER = ['common', 'elite', 'rare_2wp_b', 'rare_2wp_a']

const crestSrc = (club?: string) =>
  club ? `/clubs/${club.toLowerCase().replace(/\s+/g, '-')}.jpg` : null

type Stage = 'pack' | 'tearing' | 'back' | 'orbPos' | 'orbCrest' | 'unfurl' | 'front' | 'haul'

/* Giant outlined tier word, tiled and drifting behind the reveal */
function WordWall({ word, accent }: { word: string; accent: string }) {
  const rows = Array.from({ length: 7 })
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.5 }}>
      <div className="gf-wordwall absolute" style={{ inset: '-40%', transform: 'rotate(-10deg)' }}>
        {rows.map((_, r) => (
          <p key={r} className="whitespace-nowrap font-black uppercase leading-none"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '110px',
              letterSpacing: '0.08em',
              color: 'transparent',
              WebkitTextStroke: `1.5px ${accent}30`,
              marginLeft: r % 2 ? '-60px' : '0',
            }}>
            {`${word} `.repeat(10)}
          </p>
        ))}
      </div>
    </div>
  )
}

/* Tier-coloured card back: debossed medallion over layered wordmark texture */
function CardBack({ accent, isRare, idx, total, markSrc }: {
  accent: string; isRare: boolean; idx: number; total: number; markSrc: string
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center"
      style={{
        width: '250px', height: '360px', margin: '0 auto',
        background: `linear-gradient(165deg, ${accent}28 0%, #0F2242 40%, #08162E 100%)`,
        border: `2px solid ${accent}60`,
        boxShadow: `0 0 36px ${accent}30, inset 0 0 60px #00000080`,
      }}>
      {/* Layered wordmark texture */}
      <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ opacity: 0.07 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <p key={i} className="whitespace-nowrap font-black uppercase text-2xl leading-relaxed"
            style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8', marginLeft: i % 2 ? '-30px' : '0' }}>
            GRASSROOTS FANTASY GRASSROOTS
          </p>
        ))}
      </div>
      {/* Sheen sweep on rares */}
      {isRare && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="gf-sheen absolute top-0 bottom-0" style={{
            width: '60px',
            background: `linear-gradient(90deg, transparent, ${accent}35, transparent)`,
          }} />
        </div>
      )}
      {/* Debossed medallion */}
      <div className="relative rounded-full flex items-center justify-center"
        style={{
          width: '132px', height: '132px',
          background: 'linear-gradient(180deg, #0A1830 0%, #101F3C 100%)',
          boxShadow: `inset 0 4px 10px #000000A0, inset 0 -2px 6px ${accent}25, 0 1px 0 ${accent}30`,
          border: `1px solid ${accent}40`,
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} alt="" style={{ width: '76%', height: '76%', objectFit: 'contain', opacity: 0.9, filter: 'grayscale(0.2)' }} />
      </div>
      <p className="relative text-[10px] font-black uppercase tracking-[0.35em] mt-6" style={{ color: `${accent}90` }}>Grassroots Fantasy</p>
      <p className="relative text-xs font-bold mt-1" style={{ color: '#F5F1E860' }}>Card {idx + 1} of {total}</p>
    </div>
  )
}

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
  const [strike, setStrike] = useState(false)

  const current = sorted[idx]
  const meta = current ? (TIER_META[current.tier] ?? TIER_META.common) : TIER_META.common
  const isRare = !!current?.tier.startsWith('rare')
  const gradeLabel = grade === 'mens' ? "MEN'S" : "WOMEN'S"
  const isStarter = packName === 'Starter Pack'
  const crest = crestSrc(current?.club)
  const firstPos = (current?.positions ?? []).map(posLabel)[0] ?? '—'

  /* Orb sequence: position → crest → unfurl → front (+ strike on rares) */
  function runOrb() {
    setStage('orbPos')
    setTimeout(() => setStage('orbCrest'), 750)
    setTimeout(() => setStage('unfurl'), 1500)
    setTimeout(() => {
      setStage('front')
      if (sorted[idx].tier.startsWith('rare')) {
        setStrike(true)
        setTimeout(() => setStrike(false), 1100)
      }
    }, 2050)
  }

  function advance() {
    if (stage === 'pack') {
      setStage('tearing')
      setTimeout(() => setStage('back'), 460)
      return
    }
    if (stage === 'back') { runOrb(); return }
    if (stage === 'front') {
      const next = idx + 1
      if (next >= sorted.length) { setStage('haul'); return }
      setIdx(next)
      setStage('back')
      return
    }
    if (stage === 'haul') onDone()
  }

  const orbActive = stage === 'orbPos' || stage === 'orbCrest'
  const wallStages: Stage[] = ['back', 'orbPos', 'orbCrest', 'unfurl', 'front']

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{ background: '#000000E8', backdropFilter: 'blur(6px)', padding: '16px' }}
      onClick={advance}>

      {/* Tier word wall backdrop */}
      {wallStages.includes(stage) && current && (
        <WordWall key={`wall-${current.tier}`} word={meta.word} accent={meta.accent} />
      )}

      {/* Lightning strike flash — rares only */}
      {strike && (
        <div className="gf-strike fixed inset-0 z-[72]"
          style={{ background: `radial-gradient(circle at 50% 30%, #FFFFFF 0%, ${meta.accent}80 30%, transparent 70%)` }} />
      )}

      {/* Welcome banner — Starter Packs only */}
      {isStarter && stage !== 'haul' && (
        <div className="gf-banner-in fixed top-0 left-0 right-0 z-[71] text-center pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${T.accent}30 0%, transparent 100%)`, borderBottom: `1px solid ${T.accent}40`, padding: '18px 12px 14px' }}>
          <p className="text-base sm:text-xl font-black uppercase tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-heading)', color: T.text, textShadow: `0 0 18px ${T.accent}80` }}>
            Welcome to The Game
          </p>
        </div>
      )}

      <div className="relative text-center flex flex-col items-center"
        style={{ width: '100%', maxWidth: 'min(400px, calc(100vw - 32px))', perspective: '900px' }}>

        {/* Stage 1 — the unopened pack */}
        {(stage === 'pack' || stage === 'tearing') && (
          <div className={stage === 'tearing' ? '' : 'gf-pop'}>
            <div className={`relative mx-auto rounded-2xl pinstripe flex flex-col items-center justify-center ${stage === 'tearing' ? 'gf-tear' : 'gf-wiggle'}`}
              style={{ width: '240px', height: '340px', background: `linear-gradient(160deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `2px solid ${T.accent}`, boxShadow: `0 0 48px ${T.accent}40` }}>
              <p className="text-xs font-black uppercase tracking-[0.35em] mb-3" style={{ color: T.accent }}>Grassroots</p>
              <p className="text-lg font-black uppercase tracking-[0.2em] mb-1" style={{ fontFamily: 'var(--font-heading)', color: T.accent }}>{gradeLabel}</p>
              <p className="text-2xl font-black uppercase" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{packName}</p>
              <p className="text-sm font-bold mt-2" style={{ color: T.textDim }}>{sorted.length} cards</p>
              <div className="absolute left-3 right-3" style={{ top: '46px', borderTop: `2px dashed ${T.accent}50` }} />
            </div>
            {stage === 'pack' && (
              <span className="inline-block rounded-full mt-8 gf-pulse"
                style={{ border: `1px solid ${T.accent}60`, background: `${T.accent}15`, padding: '8px 20px' }}>
                <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>Tap to tear open</span>
              </span>
            )}
          </div>
        )}

        {/* Stage 2 — tier card back */}
        {stage === 'back' && current && (
          <div key={`back-${idx}`} className="gf-pop">
            <CardBack accent={meta.accent} isRare={isRare} idx={idx} total={sorted.length} markSrc="/gf-mark.png" />
            <span className="inline-block rounded-full mt-8 gf-pulse"
              style={{ border: `1px solid ${meta.accent}60`, background: `${meta.accent}15`, padding: '8px 20px' }}>
              <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>Tap to reveal</span>
            </span>
          </div>
        )}

        {/* Stage 3 — the orb */}
        {orbActive && current && (
          <div className="gf-orb-float">
            <div key={stage} className={`relative rounded-full flex items-center justify-center overflow-hidden ${stage === 'orbPos' ? 'gf-orb-in' : 'gf-orb-swap'}`}
              style={{
                width: '170px', height: '170px', margin: '0 auto',
                background: `radial-gradient(circle at 35% 30%, ${meta.accent}50 0%, #0F2242 60%, #08162E 100%)`,
                border: `2px solid ${meta.accent}80`,
                boxShadow: `0 0 48px ${meta.accent}50, inset 0 0 30px ${meta.accent}20`,
              }}>
              {stage === 'orbPos' ? (
                <p className="text-5xl font-black" style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8', textShadow: `0 0 20px ${meta.accent}` }}>
                  {firstPos}
                </p>
              ) : crest ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={crest} alt="" className="rounded-full" style={{ width: '78%', height: '78%', objectFit: 'cover' }} />
              ) : (
                <p className="text-5xl font-black" style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8' }}>?</p>
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] mt-7" style={{ color: `${meta.accent}C0` }}>
              {stage === 'orbPos' ? 'Position' : 'Club'}
            </p>
          </div>
        )}

        {/* Stage 4 — unfurl + revealed card */}
        {(stage === 'unfurl' || stage === 'front') && current && (
          <div key={`front-${idx}`}>
            {stage === 'front' && (
              <p className="text-sm font-black uppercase tracking-[0.35em] mb-5 gf-pop"
                style={{ color: meta.accent, textShadow: isRare ? `0 0 16px ${meta.accent}` : undefined }}>
                {meta.announce}
              </p>
            )}
            <div className={stage === 'unfurl' ? 'gf-unfurl' : ''} style={{ width: '250px', margin: '0 auto' }}>
              <div className={`relative rounded-2xl overflow-hidden flex flex-col ${stage === 'front' ? 'gf-wiggle' : ''}`}
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
            {stage === 'front' && (
              <span className="inline-block rounded-full mt-7 gf-pulse"
                style={{ border: `1px solid ${meta.accent}60`, background: `${meta.accent}15`, padding: '8px 20px' }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>
                  {idx + 1 < sorted.length ? 'Tap for the next card' : 'Tap to see your haul'}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Stage 5 — carousel haul */}
        {stage === 'haul' && (
          <div className="gf-pop w-full">
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-6" style={{ color: T.accent }}>Your Haul</p>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2" style={{ scrollSnapType: 'x mandatory' }}
              onClick={(e) => e.stopPropagation()}>
              {sorted.map((c, i) => {
                const m = TIER_META[c.tier] ?? TIER_META.common
                return (
                  <div key={i} className="gf-slide-in shrink-0 rounded-2xl overflow-hidden flex flex-col"
                    style={{
                      width: '170px', height: '245px', scrollSnapAlign: 'center',
                      animationDelay: `${i * 90}ms`,
                      background: T.surface, border: `2px solid ${m.accent}`,
                      boxShadow: c.tier.startsWith('rare') ? `0 0 32px ${m.accent}50` : `0 0 16px ${m.accent}25`,
                    }}>
                    <div className="flex-1 relative flex items-end justify-center"
                      style={{ background: `linear-gradient(180deg, ${m.accent}35 0%, ${T.surface} 95%)` }}>
                      <svg width="52%" viewBox="0 0 60 80" fill="none">
                        <circle cx="30" cy="22" r="13" fill={m.accent + '80'} />
                        <path d="M6 80 C6 52 54 52 54 80 Z" fill={m.accent + '80'} />
                      </svg>
                      <span className="absolute top-2 left-2.5 text-[9px] font-black tracking-widest"
                        style={{ color: m.accent, textShadow: `0 0 8px ${m.accent}90` }}>{m.label}</span>
                    </div>
                    <div className="text-left" style={{ background: T.headerBg, borderTop: `1px solid ${m.accent}40`, padding: '8px 10px 10px' }}>
                      <p className="text-sm font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{c.name}</p>
                      <p className="text-[10px] font-bold" style={{ color: T.textDim }}>{c.club ?? ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] font-bold mt-2 mb-4" style={{ color: T.textDim }}>Swipe to browse</p>
            <span className="inline-block rounded-full gf-pulse" style={{ border: `1px solid ${T.accent}60`, background: `${T.accent}15`, padding: '8px 20px' }}>
              <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>Tap to finish</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}