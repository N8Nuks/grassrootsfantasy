'use client'
import { useState } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'

const TIER_META: Record<string, { label: string; accent: string }> = {
  rare_2wp_a: { label: '2WP A', accent: '#FFD700' },
  rare_2wp_b: { label: '2WP B', accent: '#E8C15A' },
  elite: { label: 'ELITE', accent: '#4DA6FF' },
  common: { label: 'COMMON', accent: '#2D9E4E' },
}
const SLOT_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const posLabel = (p: string) => SLOT_LABELS[p] ?? p
const CLUB_TINTS: Record<string, string> = {
  'Bandits': '#5B2D8E', 'Howick': '#8A1E41', 'Marist': '#2456E6',
  'Otahuhu': '#2B5C9E', 'Patriots': '#B49759', 'Pukekohe': '#2D9E4E',
  'Ramblers': '#C41E3A', 'Roosters': '#C8102E', 'United': '#E03A3E',
  'United-Marist': '#C8102E', 'Waitakere': '#FFB81C',
}
const clubSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

/* ── Badge taxonomy ──
   Grouped by where the badge comes from, because the sources behave differently:
   · longevity  — computed from career games, highest tier only
   · entry      — computed at the other end, so every card carries at least one
   · rep        — representative honours, entered against the player record
   · honour     — competition awards
   · special    — selected or derived marks
   Unknown keys still render, title-cased, in the tier colour. */
const BADGE_META: Record<string, { label: string; accent: string }> = {
  // longevity
  veteran: { label: 'Veteran', accent: '#E8C15A' },
  club_legend: { label: 'Club Legend', accent: '#E8C15A' },
  icon: { label: 'Icon', accent: '#FFD700' },
  // entry
  newcomer: { label: 'Newcomer', accent: '#3FBF63' },
  rookie: { label: 'Rookie', accent: '#3FBF63' },
  // representative
  akl_junior: { label: 'Auckland Junior', accent: '#4DA6FF' },
  nz_junior: { label: 'NZ Junior', accent: '#4DA6FF' },
  akl_senior: { label: 'Auckland Rep', accent: '#2456E6' },
  nz_senior: { label: 'Black Sox / White Sox', accent: '#2456E6' },
  // honours
  mvp: { label: 'MVP', accent: '#FFD700' },
  series_team: { label: 'Series Team', accent: '#C0C0C0' },
  champion: { label: 'Champion', accent: '#FFD700' },
  // special
  superstar: { label: 'Superstar', accent: '#FF8C42' },
  speed: { label: 'Speed', accent: '#C0C0C0' },
}
const badgeMeta = (b: string, fallback: string) =>
  BADGE_META[b.toLowerCase()] ?? {
    label: b.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    accent: fallback,
  }

export type FullCardPlayer = {
  id: string
  name: string
  tier: string
  positions: string[]
  club: string
  playingNumber?: number | null
  speedStar?: boolean
  badges?: string[]
  stats: Record<string, number>
  photoUrl?: string | null
}

type RoundLine = { round: number; status: string; raw: Record<string, number>; points: number | null }
type Face = 'front' | 'career' | 'rounds'
const ORDER: Face[] = ['front', 'career', 'rounds']

function lineFor(raw: Record<string, number>): string {
  const hits = (raw.singles ?? 0) + (raw.doubles ?? 0) + (raw.triples ?? 0) + (raw.hr ?? 0)
  const parts: string[] = []
  if (raw.ab != null) parts.push(`${hits}-${raw.ab}`)
  if (raw.hr) parts.push(`HR ${raw.hr}`)
  if (raw.rbi) parts.push(`RBI ${raw.rbi}`)
  if (raw.sb) parts.push(`SB ${raw.sb}`)
  if (raw.ip) parts.push(`IP ${raw.ip}`)
  if (raw.k_pit) parts.push(`K ${raw.k_pit}`)
  if (raw.win) parts.push('W')
  if (parts.length === 0) parts.push('—')
  return parts.join(' · ')
}

export default function PlayerCardFull({ player, grade, owned, siteTheme, cardStyle = 'premium', flippable = false, doubled = false }: {
  player: FullCardPlayer
  grade: Grade
  owned: boolean
  siteTheme?: string
  cardStyle?: 'standard' | 'premium'
  flippable?: boolean
  doubled?: boolean       // cycle or perfect game last round — scores 2x this round
}) {
  const T = theme(grade, siteTheme)
  const meta = TIER_META[player.tier] ?? TIER_META.common
  const tint = CLUB_TINTS[player.club] ?? '#E8D5A3'
  const st = player.stats ?? {}
  const isPitcher = (st.season_ip ?? 0) > 0 || (st.career_ip ?? 0) > 0

  /* Three faces on two physical sides. Rotation only ever increases, so the
     side turning away is edge-on (invisible) at the halfway point — that's when
     its content is swapped, which is why nothing ever flashes mid-turn. */
  const [rot, setRot] = useState(0)
  const [slotA, setSlotA] = useState<Face>('front')   // shows at 0°, 360°, …
  const [slotB, setSlotB] = useState<Face>('career')  // shows at 180°, 540°, …
  const showing: Face = rot % 360 === 0 ? slotA : slotB

  const [log, setLog] = useState<RoundLine[] | null>(null)
  const [logError, setLogError] = useState(false)

  async function loadRounds() {
    if (log !== null || logError) return
    try {
      const res = await fetch(`/api/player-rounds?playerId=${player.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLog(data.rounds ?? [])
    } catch {
      setLogError(true)
    }
  }

  function advance() {
    if (!flippable) return
    const idx = ORDER.indexOf(showing)
    const next = ORDER[(idx + 1) % 3]
    const after = ORDER[(idx + 2) % 3]
    const nextRot = rot + 180
    if (next === 'rounds') loadRounds()
    // the side about to face the viewer is currently hidden — safe to set now
    if (nextRot % 360 === 180) setSlotB(next)
    else setSlotA(next)
    setRot(nextRot)
    // the side turning away is edge-on at ~300ms — swap it there
    setTimeout(() => {
      if (nextRot % 360 === 180) setSlotA(after)
      else setSlotB(after)
    }, 300)
  }

  // Column set: five hitting columns, plus W and K when they've pitched
  const cols: { label: string; season: string | number; hist: string | number; pitching?: boolean }[] = [
    { label: 'BA', season: st.season_ba != null ? Number(st.season_ba).toFixed(3) : '—', hist: st.career_ba != null ? Number(st.career_ba).toFixed(3) : '—' },
    { label: 'HR', season: st.season_hr ?? 0, hist: st.career_hr ?? '—' },
    { label: 'RBI', season: st.season_rbi ?? 0, hist: st.career_rbi ?? '—' },
    { label: 'SB', season: st.season_sb ?? 0, hist: st.career_sb ?? '—' },
    ...(isPitcher ? [
      { label: 'W', season: st.season_wins ?? 0, hist: st.career_w ?? st.career_wins ?? '—', pitching: true },
      { label: 'K', season: st.season_k_pit ?? 0, hist: st.career_k ?? '—', pitching: true },
    ] : []),
  ]

  const badges = player.badges ?? []
  const num = (v: unknown) => (v == null ? '—' : String(v))
  const careerBat: [string, string][] = [
    ['Games', num(st.career_games)],
    ['Bat Ave.', st.career_ba != null ? Number(st.career_ba).toFixed(3) : '—'],
    ['Home Runs', num(st.career_hr)],
    ['RBI', num(st.career_rbi)],
    ['Stolen Bases', num(st.career_sb)],
  ]
  const careerPitch: [string, string][] = isPitcher ? [
    ['Innings', num(st.career_ip)],
    ['Wins', num(st.career_w ?? st.career_wins)],
    ['Strikeouts', num(st.career_k)],
  ] : []

  function Dots({ active }: { active: Face }) {
    if (!flippable) return null
    return (
      <span className="flex items-center gap-1.5">
        {ORDER.map(f => (
          <span key={f} style={{
            width: f === active ? '14px' : '5px', height: '5px', borderRadius: '3px',
            background: f === active ? meta.accent : '#F5F1E840',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </span>
    )
  }

  // A doubled card takes the achievement colour so it can't be mistaken for its tier
  const DOUBLE = '#FF8C42'
  const shellStyle = {
    backfaceVisibility: 'hidden' as const, WebkitBackfaceVisibility: 'hidden' as const,
    padding: '7px',
    background: doubled
      ? `linear-gradient(165deg, ${DOUBLE} 0%, ${DOUBLE}70 45%, ${DOUBLE}30 100%)`
      : `linear-gradient(165deg, ${meta.accent} 0%, ${meta.accent}55 40%, ${meta.accent}25 100%)`,
    boxShadow: doubled
      ? `0 0 30px ${DOUBLE}70, 0 0 70px ${DOUBLE}28`
      : `0 0 36px ${meta.accent}30`,
  }

  /* ── FACE: the player card itself ── */
  function FrontFace() {
    return (
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: T.surface, border: '1px solid #F5F1E825' }}>
        {/* Banner — crest / club + name / gem */}
        <div className="flex items-center gap-3 pinstripe-fine" style={{ flex: '0 0 19%', background: T.headerBg, borderBottom: `1px solid ${meta.accent}40`, padding: '0 14px' }}>
          <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: '44px', height: '44px', background: '#141210', border: `1.5px solid ${tint}70` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/clubs/${clubSlug(player.club)}.jpg`} alt={player.club}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.currentTarget
                el.style.display = 'none'
                if (el.parentElement) {
                  el.parentElement.style.background = `${tint}25`
                  el.parentElement.innerHTML = `<span style="color:${tint};font-weight:900;font-size:16px">${player.club[0]}</span>`
                }
              }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] truncate" style={{ color: T.textDim }}>{player.club}</p>
            <p className="text-lg sm:text-xl font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{player.name}</p>
          </div>
          {/* Gem corner — outlined diamond, uniform number in tier colour */}
          <div className="shrink-0 flex items-center justify-center"
            style={{
              width: '54px', height: '54px',
              background: `linear-gradient(150deg, ${meta.accent} 0%, ${meta.accent}60 100%)`,
              clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)',
              boxShadow: `0 0 14px ${meta.accent}60`,
              padding: '2.5px',
            }}>
            <span className="w-full h-full flex items-center justify-center"
              style={{ background: T.headerBg, clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)' }}>
              <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-number, var(--font-heading))', color: meta.accent, textShadow: `0 0 8px ${meta.accent}60` }}>{player.playingNumber ?? 26}</span>
            </span>
          </div>
        </div>
        {/* Photo / artwork area */}
        <div className="relative flex items-end justify-center overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0, background: T.surface }}>
          {cardStyle === 'premium' && owned ? (
            <div className="absolute inset-0" style={{
              backgroundImage: `url(/card-bg-${player.tier === 'rare_2wp_a' ? 'rare2wpa' : player.tier === 'rare_2wp_b' ? 'rare2wpb' : player.tier === 'elite' ? 'elite' : 'common'}.webp)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }} />
          ) : (
            <div className="absolute inset-0" style={{
              background: owned
                ? `linear-gradient(115deg, transparent 0%, transparent 42%, ${meta.accent}30 42%, ${meta.accent}30 52%, transparent 52%, transparent 60%, ${tint}28 60%, ${tint}28 66%, transparent 66%),
                   linear-gradient(180deg, ${meta.accent}20 0%, ${T.surface} 85%)`
                : `linear-gradient(180deg, #ffffff08 0%, ${T.surface} 85%)`,
            }} />
          )}
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.name} className="relative"
              style={{
                height: '92%', width: 'auto', maxWidth: '94%',
                objectFit: 'contain', objectPosition: 'bottom',
                filter: owned ? 'drop-shadow(0 6px 18px #00000070)' : 'grayscale(1) brightness(0.5)',
              }} />
          ) : (
            <svg width="46%" viewBox="0 0 60 80" fill="none" className="relative"
              style={{ filter: owned ? 'none' : 'grayscale(1) brightness(0.5)', maxHeight: '88%' }}>
              <circle cx="30" cy="22" r="13" fill={owned ? meta.accent + '75' : '#ffffff20'} />
              <path d="M6 80 C6 52 54 52 54 80 Z" fill={owned ? meta.accent + '75' : '#ffffff20'} />
            </svg>
          )}
          <span className="absolute top-3 left-3.5 text-[10px] font-black tracking-widest"
            style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}90, 0 0 16px ${meta.accent}50` }}>{meta.label}</span>
          {doubled && (
            <span className="absolute top-3 right-3.5 text-[10px] font-black uppercase tracking-widest rounded-full gf-pulse"
              style={{ color: '#141210', background: DOUBLE, padding: '3px 10px', boxShadow: `0 0 14px ${DOUBLE}` }}>
              Double Points
            </span>
          )}
          {!owned && (
            <span className="absolute top-3 right-3.5 text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.textDim, textShadow: '0 0 8px #00000090' }}>Unowned</span>
          )}
          {badges.length > 0 && (
            <div className="absolute left-3 flex flex-col gap-1 items-start" style={{ bottom: '10px' }}>
              {badges.slice(0, 3).map(b => {
                const bm = badgeMeta(b, meta.accent)
                return (
                  <span key={b} className="text-[8px] font-black uppercase tracking-widest rounded-full"
                    style={{ color: '#141210', background: bm.accent, padding: '3px 9px', boxShadow: `0 0 10px ${bm.accent}70` }}>
                    {bm.label}
                  </span>
                )
              })}
            </div>
          )}
          {flippable && (
            <span className="absolute bottom-2 right-3 text-[8px] font-bold uppercase tracking-widest"
              style={{ color: T.textDim, textShadow: '0 0 6px #000000' }}>Tap for career ⟳</span>
          )}
        </div>
        {/* Positions row */}
        <div className="text-center" style={{ flex: '0 0 auto', background: T.headerBg, borderTop: `1px solid ${meta.accent}40`, padding: '8px 14px 6px' }}>
          <p className="text-[11px] font-black tracking-[0.2em]" style={{ color: meta.accent, textShadow: `0 0 8px ${meta.accent}70` }}>
            {player.positions.map(posLabel).join(' · ')}{player.speedStar ? ' · ★' : ''}
          </p>
        </div>
        {/* Stat table — points column + divided grid */}
        <div className="flex items-stretch" style={{ flex: '0 0 auto', background: T.headerBg, padding: '6px 14px 14px', gap: '12px' }}>
          <div className="shrink-0 flex flex-col justify-center text-center" style={{ borderRight: `1px solid ${meta.accent}30`, paddingRight: '12px' }}>
            <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: meta.accent }}>Season Points</p>
            <p className="text-3xl font-black leading-none" style={{ fontFamily: 'var(--font-heading)', color: meta.accent, textShadow: `0 0 14px ${meta.accent}60`, margin: '4px 0' }}>
              {st.season_points ?? 0}
            </p>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: T.textDim }}>2026/27</p>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex" style={{ marginBottom: '3px' }}>
              <div className="text-center" style={{ flex: cols.filter(c => !c.pitching).length }}>
                <p className="text-[7px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim }}>2026/27</p>
              </div>
              {cols.some(c => c.pitching) && (
                <div className="text-center" style={{ flex: cols.filter(c => c.pitching).length, borderLeft: `1px solid ${meta.accent}50` }}>
                  <p className="text-[7px] font-black uppercase tracking-[0.25em]" style={{ color: meta.accent }}>Pitching</p>
                </div>
              )}
            </div>
            <div className="flex">
              {cols.map((c, i) => {
                const startPitch = c.pitching && !cols[i - 1]?.pitching
                return (
                  <div key={c.label} className="flex-1 text-center relative"
                    style={{ borderLeft: startPitch ? `1px solid ${meta.accent}50` : i > 0 ? '1px solid #ffffff12' : 'none' }}>
                    <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: c.pitching ? meta.accent : T.textDim }}>{c.label}</p>
                    <p className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{c.season}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex" style={{ borderTop: '1px solid #ffffff10', marginTop: '4px', paddingTop: '4px' }}>
              {cols.map((c, i) => (
                <div key={c.label} className="flex-1 text-center" style={{ borderLeft: c.pitching && !cols[i - 1]?.pitching ? `1px solid ${meta.accent}35` : i > 0 ? '1px solid #ffffff0a' : 'none' }}>
                  <p className="text-xs font-bold" style={{ color: T.textDim }}>{c.hist}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2" style={{ marginTop: '3px' }}>
              <Dots active="front" />
              <div className="flex items-center gap-2">
                <p className="text-[7px] font-bold uppercase tracking-widest" style={{ color: T.textDim, opacity: 0.7 }}>2023-26 BA &amp; Period Totals</p>
                {cardStyle === 'premium' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/gf-mark.png" alt="GF" style={{ height: '14px', width: 'auto', opacity: 0.45 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── FACE: career and honours ── */
  function CareerFace() {
    return (
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: T.surface, border: '1px solid #F5F1E825' }}>
        <div className="text-center pinstripe-fine" style={{ background: T.headerBg, borderBottom: `1px solid ${meta.accent}40`, padding: '14px 16px 12px' }}>
          <p className="text-base font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{player.name}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: meta.accent, marginTop: '3px' }}>Career &amp; Honours</p>
        </div>

        <div className="flex-1 overflow-y-auto gf-noscroll" style={{ padding: '14px 16px' }}>
          {/* Badges */}
          <p className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: T.textDim, marginBottom: '8px' }}>Badges</p>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '18px' }}>
              {badges.map(b => {
                const bm = badgeMeta(b, meta.accent)
                return (
                  <span key={b} className="text-[9px] font-black uppercase tracking-widest rounded-full"
                    style={{ color: bm.accent, background: `${bm.accent}18`, border: `1px solid ${bm.accent}60`, padding: '5px 11px' }}>
                    {bm.label}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed rounded-lg"
              style={{ color: T.textDim, background: '#ffffff08', border: '1px solid #ffffff12', padding: '10px 12px', marginBottom: '18px' }}>
              Longevity badges, rep honours and career games arrive with the real competition in September.
            </p>
          )}

          {/* Career batting */}
          <p className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: T.textDim, marginBottom: '6px' }}>Career</p>
          <div style={{ marginBottom: careerPitch.length ? '16px' : '0' }}>
            {careerBat.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between"
                style={{ borderBottom: '1px solid #ffffff0a', padding: '7px 2px' }}>
                <span className="text-[11px] font-bold" style={{ color: T.textDim }}>{label}</span>
                <span className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: value === '—' ? T.textDim : T.text }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Career pitching */}
          {careerPitch.length > 0 && (
            <>
              <p className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: meta.accent, marginBottom: '6px' }}>Career Pitching</p>
              <div>
                {careerPitch.map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between"
                    style={{ borderBottom: '1px solid #ffffff0a', padding: '7px 2px' }}>
                    <span className="text-[11px] font-bold" style={{ color: T.textDim }}>{label}</span>
                    <span className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: value === '—' ? T.textDim : meta.accent }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between" style={{ background: T.headerBg, borderTop: `1px solid ${meta.accent}40`, padding: '10px 16px' }}>
          <Dots active="career" />
          <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: T.textDim }}>Tap for rounds</p>
        </div>
      </div>
    )
  }

  /* ── FACE: round-by-round log ── */
  function RoundsFace() {
    return (
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: T.surface, border: '1px solid #F5F1E825' }}>
        <div className="text-center pinstripe-fine" style={{ background: T.headerBg, borderBottom: `1px solid ${meta.accent}40`, padding: '14px 16px 12px' }}>
          <p className="text-base font-black leading-tight" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{player.name}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: meta.accent, marginTop: '3px' }}>Round by Round</p>
        </div>
        <div className="flex-1 overflow-y-auto gf-noscroll" style={{ padding: '6px 0' }}>
          {log === null && !logError && (
            <p className="text-xs text-center" style={{ color: T.textDim, padding: '32px 16px' }}>Loading…</p>
          )}
          {logError && (
            <p className="text-xs text-center" style={{ color: T.textDim, padding: '32px 16px' }}>Couldn&apos;t load round stats.</p>
          )}
          {log !== null && log.length === 0 && (
            <p className="text-xs text-center" style={{ color: T.textDim, padding: '32px 16px' }}>No rounds scored yet — check back after the first round.</p>
          )}
          {(log ?? []).map(r => (
            <div key={r.round} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '9px 16px' }}>
              <span className="w-9 shrink-0 text-[10px] font-black uppercase" style={{ color: T.textDim }}>Rd {r.round}</span>
              <span className="flex-1 min-w-0 text-[11px] font-bold" style={{ color: T.text }}>{lineFor(r.raw)}</span>
              <span className="w-11 shrink-0 text-right text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: meta.accent }}>
                {r.points != null ? r.points : '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between" style={{ background: T.headerBg, borderTop: `1px solid ${meta.accent}40`, padding: '10px 16px' }}>
          <Dots active="rounds" />
          <p className="text-[9px] font-bold uppercase tracking-[0.25em]" style={{ color: T.textDim }}>Tap for the card</p>
        </div>
      </div>
    )
  }

  const renderFace = (f: Face) =>
    f === 'front' ? <FrontFace /> : f === 'career' ? <CareerFace /> : <RoundsFace />

  return (
    <div className="w-full" style={{ aspectRatio: '5 / 7.2', maxHeight: '78vh', margin: '0 auto', perspective: '1100px', cursor: flippable ? 'pointer' : 'default' }}
      onClick={advance}>
      <div className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.3, 0.1, 0.3, 1)', transform: `rotateY(${rot}deg)` }}>

        {/* Side A — faces the viewer at 0°, 360°, … */}
        <div className="absolute inset-0 rounded-2xl flex flex-col" style={shellStyle}>
          {renderFace(slotA)}
        </div>

        {/* Side B — faces the viewer at 180°, 540°, … */}
        <div className="absolute inset-0 rounded-2xl flex flex-col"
          style={{ ...shellStyle, transform: 'rotateY(180deg)' }}>
          {renderFace(slotB)}
        </div>
      </div>
    </div>
  )
}