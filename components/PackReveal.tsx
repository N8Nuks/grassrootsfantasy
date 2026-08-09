'use client'
import { useState, useEffect } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'
import PlayerCardFull from '@/components/PlayerCardFull'
import PlayerCard from '@/components/PlayerCard'

export type RevealCard = {
  name: string
  tier: string
  club?: string
  positions?: string[]
  stats?: Record<string, number>
  photoUrl?: string | null
  playingNumber?: number | null
  revealPos?: string | null
}

const TIER_META: Record<string, { label: string; word: string; accent: string; announce: string }> = {
  rare_2wp_a: { label: '2WP A', word: 'RARE', accent: '#FFD700', announce: 'RARE PULL!' },
  rare_2wp_b: { label: '2WP B', word: 'RARE', accent: '#E8C15A', announce: 'RARE PULL!' },
  elite: { label: 'ELITE', word: 'ELITE', accent: '#4DA6FF', announce: 'Elite' },
  common: { label: 'COMMON', word: 'COMMON', accent: '#2D9E4E', announce: 'Common' },
}

// Reveal order: Commons first, building to the 2WP A finale
const REVEAL_ORDER = ['common', 'elite', 'rare_2wp_b', 'rare_2wp_a']

const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

// Orb label: P beats C beats IF beats OF; outfielders with at most one infield spot read OF
function posBucket(positions: string[]): string {
  const set = new Set(positions)
  if (set.has('P') || set.has('PB')) return 'P'
  if (set.has('C')) return 'C'
  const ifCount = ['B1', 'B2', 'B3', 'SS'].filter(p => set.has(p)).length
  const hasOF = ['LF', 'CF', 'RF'].some(p => set.has(p))
  if (hasOF && ifCount <= 1) return 'OF'
  if (ifCount > 0) return 'IF'
  return 'OF'
}

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
/* Video lightning overlay: plays /lightning.webm blended over the reveal.
   If the file is missing or fails, falls back to the code-drawn storm. */
function LightningVideo({ color, onFail }: { color: string; onFail: () => void }) {
  return (
    <video
      className="fixed inset-0 z-[73] w-full h-full pointer-events-none"
      style={{ objectFit: 'contain', mixBlendMode: 'screen', filter: `drop-shadow(0 0 30px ${color})` }}
      src="/lightning.webm"
      autoPlay
      muted
      playsInline
      onError={onFail}
    />
  )
}
/* Lightning storm: diagonal forked bolts striking the card, with impact sparks */
const BOLTS = [
  // Diagonal from top-left into centre, forks off midway
  { d: 'M-20 40 L90 130 L70 190 L180 280 L160 330 L215 400', forks: ['M180 280 L245 320 L230 370', 'M90 130 L140 150 L128 195'], delay: 0 },
  // Diagonal from top-right into centre
  { d: 'M420 20 L320 140 L345 200 L250 310 L268 360 L205 420', forks: ['M250 310 L195 340 L210 395', 'M320 140 L280 165 L295 215'], delay: 650 },
  // Steep from top, kicks left into the card
  { d: 'M260 -20 L230 120 L275 180 L215 300 L240 355 L195 410', forks: ['M215 300 L160 335 L178 385'], delay: 1350 },
  // Final: low sweeping diagonal from the left, biggest fork
  { d: 'M-30 200 L110 260 L95 320 L200 380 L185 420', forks: ['M110 260 L170 240 L195 285', 'M200 380 L260 355 L250 415'], delay: 2150 },
]
const SPARKS = [
  { sx: '-34px', sy: '-26px' }, { sx: '30px', sy: '-34px' }, { sx: '-42px', sy: '10px' },
  { sx: '44px', sy: '4px' }, { sx: '-20px', sy: '34px' }, { sx: '26px', sy: '30px' },
  { sx: '-8px', sy: '-44px' }, { sx: '10px', sy: '42px' },
]
function LightningStorm({ color }: { color: string }) {
  return (
    <>
      {/* Sky flashes syncing with each strike */}
      {BOLTS.map((b, i) => (
        <div key={`sky-${i}`} className="gf-skyflash fixed inset-0 z-[72]"
          style={{
            animationDelay: `${b.delay}ms`,
            animationDuration: `${900 + i * 120}ms`,
            background: `radial-gradient(circle at ${i % 2 ? '70%' : '30%'} 20%, #FFFFFF30 0%, ${color}20 35%, transparent 70%)`,
          }} />
      ))}
      <svg className="fixed inset-0 z-[73] w-full h-full pointer-events-none"
        viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" fill="none">
        {BOLTS.map((b, i) => (
          <g key={i} className="gf-bolt"
            style={{ animationDelay: `${b.delay}ms`, animationDuration: `${850 + i * 150}ms` }}>
            <path d={b.d} stroke={color} strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" opacity="0.5"
              style={{ filter: `blur(6px) drop-shadow(0 0 16px ${color})` }} />
            <path d={b.d} stroke="#FFFFFF" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px #FFFFFF) drop-shadow(0 0 14px ${color})` }} />
            {b.forks.map((f, j) => (
              <path key={j} d={f} stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85"
                style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
            ))}
          </g>
        ))}
      </svg>
      {/* Impact sparks bursting from the centre with each strike */}
      <div className="fixed z-[74] pointer-events-none" style={{ left: '50%', top: '50%' }}>
        {BOLTS.map((b, i) =>
          SPARKS.map((s, j) => (
            <span key={`${i}-${j}`} className="gf-spark"
              style={{
                background: j % 2 ? '#FFFFFF' : color,
                boxShadow: `0 0 6px ${color}`,
                animationDelay: `${b.delay + 60}ms`,
                ['--sx' as string]: s.sx,
                ['--sy' as string]: s.sy,
              }} />
          ))
        )}
      </div>
    </>
  )
}

/* Tier-coloured card back: debossed medallion over layered wordmark texture */
function CardBack({ accent, isRare, idx, total }: {
  accent: string; isRare: boolean; idx: number; total: number
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center"
      style={{
        width: '250px', height: '360px', margin: '0 auto',
        background: `linear-gradient(165deg, ${accent}28 0%, #0F2242 40%, #08162E 100%)`,
        border: `2px solid ${accent}60`,
        boxShadow: `0 0 36px ${accent}30, inset 0 0 60px #00000080`,
      }}>
      <div className="absolute inset-0 flex flex-col justify-center overflow-hidden" style={{ opacity: 0.07 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <p key={i} className="whitespace-nowrap font-black uppercase text-2xl leading-relaxed"
            style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8', marginLeft: i % 2 ? '-30px' : '0' }}>
            GRASSROOTS FANTASY GRASSROOTS
          </p>
        ))}
      </div>
      {isRare && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="gf-sheen absolute top-0 bottom-0" style={{
            width: '60px',
            background: `linear-gradient(90deg, transparent, ${accent}35, transparent)`,
          }} />
        </div>
      )}
      <div className="relative rounded-full flex items-center justify-center"
        style={{
          width: '132px', height: '132px',
          background: 'linear-gradient(180deg, #0A1830 0%, #101F3C 100%)',
          boxShadow: `inset 0 4px 10px #000000A0, inset 0 -2px 6px ${accent}25, 0 1px 0 ${accent}30`,
          border: `1px solid ${accent}40`,
        }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gf-mark.png" alt="" style={{ width: '76%', height: '76%', objectFit: 'contain', opacity: 0.9, filter: 'grayscale(0.2)' }} />
      </div>
      <p className="relative text-[10px] font-black uppercase tracking-[0.35em] mt-6" style={{ color: `${accent}90` }}>Grassroots Fantasy</p>
      <p className="relative text-xs font-bold mt-1" style={{ color: '#F5F1E860' }}>Card {idx + 1} of {total}</p>
    </div>
  )
}

/* Foil packet: crimped tear strip, series markings, barcode */
function FoilPacket({ T, gradeLabel, packName, count, tearing }: {
  T: ReturnType<typeof theme>; gradeLabel: string; packName: string; count: number; tearing: boolean
}) {
  const crimp = `repeating-linear-gradient(90deg, #ffffff28 0px, #ffffff28 3px, transparent 3px, transparent 6px)`
  const barcode = `repeating-linear-gradient(90deg, #F5F1E8 0px, #F5F1E8 2px, transparent 2px, transparent 4px, #F5F1E8 4px, #F5F1E8 5px, transparent 5px, transparent 9px)`
  return (
    <div className={`relative mx-auto flex flex-col ${tearing ? 'gf-tear' : 'gf-wiggle'}`}
      style={{
        width: '250px', height: '360px', borderRadius: '10px', overflow: 'hidden',
        background: `linear-gradient(150deg, ${T.surfaceRaised} 0%, ${T.surface} 42%, #ffffff14 50%, ${T.surface} 58%, #0B0E14 100%)`,
        border: `1.5px solid ${T.accent}70`,
        boxShadow: `0 0 48px ${T.accent}35, inset 0 0 40px #00000060`,
      }}>
      {/* Crimped seals top + bottom */}
      <div style={{ height: '16px', background: crimp, borderBottom: `1px solid #ffffff20` }} />
      {/* Tear strip */}
      <div className="flex items-center" style={{ borderBottom: `2px dashed ${T.accent}60`, padding: '5px 12px' }}>
        <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: T.accent }}>Tear here ▸</span>
      </div>
      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center relative" style={{ padding: '0 16px' }}>
        {/* Foil sheen band */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(115deg, transparent 30%, #ffffff10 46%, #ffffff22 50%, #ffffff10 54%, transparent 70%)' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gf-mark.png" alt="" style={{ width: '84px', height: '84px', objectFit: 'contain', filter: `drop-shadow(0 0 16px ${T.accent}60)` }} />
        <p className="text-[9px] font-black uppercase tracking-[0.35em] mt-4" style={{ color: T.accent }}>Grassroots Fantasy</p>
        <p className="text-lg font-black uppercase tracking-[0.15em] mt-1" style={{ fontFamily: 'var(--font-heading)', color: T.accent }}>{gradeLabel}</p>
        <p className="text-2xl font-black uppercase text-center leading-tight" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{packName}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-3 px-3 py-1 rounded-full"
          style={{ color: T.text, border: `1px solid ${T.accent}50`, background: `${T.accent}12` }}>
          {count} Official Cards
        </p>
      </div>
      {/* Barcode footer */}
      <div className="flex items-end justify-between" style={{ padding: '8px 14px 10px', borderTop: '1px solid #ffffff12' }}>
        <div>
          <div style={{ width: '92px', height: '22px', background: barcode, opacity: 0.85 }} />
          <p className="text-[7px] font-bold tracking-[0.2em] mt-1" style={{ color: '#F5F1E870' }}>NFS · SEASON ONE · 2026/27</p>
        </div>
        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#F5F1E850' }}>Series 1</p>
      </div>
      <div style={{ height: '16px', background: crimp, borderTop: `1px solid #ffffff20` }} />
    </div>
  )
}

export default function PackReveal({ grade, packName, cards, onDone, cardStyle = 'premium' }: {
  grade: Grade
  packName: string
  cards: RevealCard[]
  onDone: () => void
  cardStyle?: 'standard' | 'premium'
}) {
  const T = theme(grade)
  const sorted = [...cards].sort((a, b) => REVEAL_ORDER.indexOf(a.tier) - REVEAL_ORDER.indexOf(b.tier))

  const [stage, setStage] = useState<Stage>('pack')
  const [idx, setIdx] = useState(0)
  const [strike, setStrike] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  useEffect(() => {
    setIsPortrait(window.matchMedia('(max-width: 640px)').matches)
  }, [])

  const current = sorted[idx]
  const meta = current ? (TIER_META[current.tier] ?? TIER_META.common) : TIER_META.common
  const isRare = !!current?.tier.startsWith('rare')
  const gradeLabel = grade === 'mens' ? "MEN'S" : "WOMEN'S"
  const isStarter = packName === 'Starter Pack'
  const crest = current?.club ? `/clubs/${clubSlug(current.club)}.jpg` : null

  /* Orb sequence: position → crest → unfurl → real card (+ bolt on rares) */
  function runOrb() {
    setStage('orbPos')
    setTimeout(() => setStage('orbCrest'), 800)
    setTimeout(() => setStage('unfurl'), 1650)
    setTimeout(() => {
      setStage('front')
      if (sorted[idx].tier.startsWith('rare')) {
        setStrike(true)
        setTimeout(() => setStrike(false), 3200)
      }
    }, 2200)
  }

  function revealAll(e: React.MouseEvent) {
    e.stopPropagation()
    setStage('haul')
  }
  function skipToRares(e: React.MouseEvent) {
    e.stopPropagation()
    const rareIdx = sorted.findIndex(c => c.tier.startsWith('rare'))
    if (rareIdx === -1 || rareIdx <= idx) return
    setIdx(rareIdx)
    setStage('back')
  }

  const raresAhead = sorted.some((c, i) => i > idx && c.tier.startsWith('rare')) && !sorted[idx]?.tier.startsWith('rare')
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
    if (stage === 'haul') {
      if (finishing) return
      setFinishing(true)
      onDone()
    }
  }

  const orbActive = stage === 'orbPos' || stage === 'orbCrest'
  const wallStages: Stage[] = ['back', 'orbPos', 'orbCrest', 'unfurl', 'front']

  function toFullPlayer(c: RevealCard) {
    return {
      id: c.name,
      name: c.name,
      tier: c.tier,
      positions: c.positions ?? [],
      club: c.club ?? '',
      stats: c.stats ?? {},
      photoUrl: c.photoUrl ?? null,
      playingNumber: c.playingNumber ?? null,
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{ background: '#000000E8', backdropFilter: 'blur(6px)', padding: '16px' }}
      onClick={advance}>
      
      {/* Skip controls — top corner, clear of the reveal tap zone */}
      {stage !== 'haul' && stage !== 'pack' && stage !== 'tearing' && (
        <div className="fixed left-3 right-3 z-[75] flex items-start" style={{ top: '64px' }}>
          {/* then on the Reveal all button add marginLeft: 'auto' to its style */}
          {raresAhead && (
            <button onClick={skipToRares}
              className="text-[10px] font-bold uppercase tracking-[0.2em] rounded-full"
              style={{ color: T.text, background: '#000000A0', border: `1px solid ${T.accent}50`, padding: '8px 14px', backdropFilter: 'blur(4px)' }}>
              Skip to Rares ⚡
            </button>
          )}
          <button onClick={revealAll} aria-label="Reveal all cards"
            className="text-[10px] font-bold uppercase tracking-[0.2em] rounded-full"
            style={{ color: T.textDim, background: '#000000A0', border: '1px solid #ffffff25', padding: '8px 14px', backdropFilter: 'blur(4px)' }}>
            Reveal all →
          </button>
        </div>
      )}
      {/* Tier word wall backdrop */}
      {wallStages.includes(stage) && current && (
        <WordWall key={`wall-${current.tier}`} word={meta.word} accent={meta.accent} />
      )}

      {/* Sorare-style bolt — rares only */}
      {strike && ((videoFailed || isPortrait)
        ? <LightningStorm color={meta.accent} />
        : <LightningVideo color={meta.accent} onFail={() => setVideoFailed(true)} />)}

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
        style={{ width: '100%', maxWidth: 'min(420px, calc(100vw - 24px))', perspective: '900px' }}>

        {/* Stage 1 — the foil packet */}
        {(stage === 'pack' || stage === 'tearing') && (
          <div className={stage === 'tearing' ? '' : 'gf-pop'}>
            <FoilPacket T={T} gradeLabel={gradeLabel} packName={packName} count={sorted.length} tearing={stage === 'tearing'} />
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
            <CardBack accent={meta.accent} isRare={isRare} idx={idx} total={sorted.length} />
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
                  {current.revealPos ?? posBucket(current.positions ?? [])}
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

        {/* Stage 4 — unfurl + the real card */}
        {(stage === 'unfurl' || stage === 'front') && current && (
          <div key={`front-${idx}`} className="w-full">
            {stage === 'front' && (
              <p className="text-sm font-black uppercase tracking-[0.35em] mb-4 gf-pop"
                style={{ color: meta.accent, textShadow: isRare ? `0 0 16px ${meta.accent}` : undefined }}>
                {meta.announce}
              </p>
            )}
            <div className={`relative ${stage === 'unfurl' ? 'gf-unfurl' : ''}`}
              style={{ width: 'min(300px, 82vw)', margin: '0 auto' }}>
              {stage === 'front' && isRare && (
                <div className="gf-rim absolute inset-0 rounded-2xl z-10"
                  style={{ ['--rim' as string]: `${meta.accent}90` }} />
              )}
              <PlayerCardFull
                player={toFullPlayer(current)}
                grade={grade}
                owned={true}
                cardStyle={cardStyle}
              />
            </div>
            {stage === 'front' && (
              <span className="inline-block rounded-full mt-6 gf-pulse"
                style={{ border: `1px solid ${meta.accent}60`, background: `${meta.accent}15`, padding: '8px 20px' }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>
                  {idx + 1 < sorted.length ? 'Tap for the next card' : 'Tap to see your haul'}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Stage 5 — haul: dense scroll, rares lead */}
        {stage === 'haul' && (
          <div className="gf-pop w-full">
            <p className="text-sm font-black uppercase tracking-[0.35em] mb-4" style={{ color: T.accent }}>Your Haul</p>
            <div className="flex gap-4 overflow-x-auto pb-4 gf-noscroll" style={{ scrollSnapType: 'x mandatory', padding: '0 48px' }}
              onClick={(e) => e.stopPropagation()}>
              {sorted.slice().reverse().map((c, i) => {
                const m = TIER_META[c.tier] ?? TIER_META.common
                const isRareCard = c.tier.startsWith('rare')
                return (
                  <div key={i} className="gf-slide-in shrink-0" style={{
                    width: '190px', scrollSnapAlign: 'center', animationDelay: `${Math.min(i * 60, 600)}ms`,
                    filter: isRareCard ? `drop-shadow(0 0 16px ${m.accent}60)` : 'none',
                  }}>
                    <PlayerCard
                      player={toFullPlayer(c)}
                      grade={grade}
                      owned={true}
                      cardStyle={cardStyle}
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] font-bold mt-1 mb-4" style={{ color: T.textDim }}>Swipe to browse — rares first</p>
            <span className="inline-block rounded-full gf-pulse" style={{ border: `1px solid ${T.accent}60`, background: `${T.accent}15`, padding: '8px 20px' }}>
              <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: T.text }}>
                {finishing ? 'Loading your team…' : 'Tap to finish'}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}