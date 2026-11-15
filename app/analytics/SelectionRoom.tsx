'use client'
import { useMemo, useState } from 'react'
import type { SelectionRoom as Room, SelectionPlayer, Verdict } from '@/lib/selection'
import { splitName } from '@/lib/names'

/* The Selection Room look: a dark instrument panel. Cyan is the primary
   colour for everyone; the manager's own theme colour (`second`) is the
   secondary — the far end of every gradient, and the "in form" signal. */
export const TECH = {
  bg: '#070B14',
  panel: '#0D1422',
  panelUp: '#111B2E',
  line: '#22D3EE26',
  grid: '#22D3EE0A',
  text: '#E6FBFF',
  dim: '#8FB3C2',
  cyan: '#22D3EE',
  on: '#03121A',
  ok: '#34F5A4',
  warn: '#FF7A59',
  glow: '#22D3EE66',
}
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

const VERDICT: Record<Verdict, { label: string; tone: 'ok' | 'second' | 'warn' | 'dim' | 'cyan' }> = {
  lock_in: { label: 'Lock in', tone: 'ok' },
  in_form: { label: 'In form', tone: 'second' },
  steady: { label: 'Steady', tone: 'cyan' },
  boom_bust: { label: 'Boom or bust', tone: 'warn' },
  going_cold: { label: 'Going cold', tone: 'warn' },
  part_timer: { label: 'Part-timer', tone: 'warn' },
  rotation: { label: 'Rotation', tone: 'dim' },
  new: { label: 'Small sample', tone: 'dim' },
  not_named: { label: 'Not named', tone: 'warn' },
  sitting_out: { label: 'Sitting out', tone: 'dim' },
}

type Sort = 'best' | 'reliable' | 'form' | 'pitchers'
const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best picks' },
  { key: 'reliable', label: 'Reliable' },
  { key: 'form', label: 'In form' },
  { key: 'pitchers', label: 'Pitchers' },
]

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

export default function SelectionRoom({ room, second }: { room: Room; second: string }) {
  const [sort, setSort] = useState<Sort>('best')
  const [open, setOpen] = useState<string | null>(room.players[0]?.id ?? null)
  const [showAll, setShowAll] = useState(false)

  const toneOf = (t: 'ok' | 'second' | 'warn' | 'dim' | 'cyan') =>
    t === 'ok' ? TECH.ok : t === 'second' ? second : t === 'warn' ? TECH.warn : t === 'cyan' ? TECH.cyan : TECH.dim
  const grad = `linear-gradient(90deg, ${TECH.cyan}, ${second})`
  const gradUp = `linear-gradient(180deg, ${TECH.cyan}, ${second})`

  const list = useMemo(() => {
    const xs = [...room.players]
    if (sort === 'reliable') {
      xs.sort((a, b) => (b.clubRounds ? b.played / b.clubRounds : 0) - (a.clubRounds ? a.played / a.clubRounds : 0)
        || b.played - a.played || b.beatPar - a.beatPar || b.avg - a.avg)
    } else if (sort === 'form') {
      xs.sort((a, b) => (b.played >= 2 ? b.last3 : -1) - (a.played >= 2 ? a.last3 : -1) || b.avg - a.avg)
    } else if (sort === 'pitchers') {
      return xs.filter(p => p.pitcher)
    }
    return xs
  }, [room.players, sort])

  const squad = room.players.length
  const scale = Math.max(room.par * 2, ...room.players.map(p => p.high), 1)
  const parPct = Math.min(100, (room.par / scale) * 100)
  const SHOWN = 8
  const shown = showAll ? list : list.slice(0, SHOWN)

  const name = (n: string) => {
    const s = splitName(n)
    return s.last ? <>{s.first} <span className="uppercase">{s.last}</span></> : <>{s.first}</>
  }
  const panel = { background: `${TECH.panel}E6`, border: `1px solid ${TECH.line}`, borderRadius: '14px' } as const
  const eyebrow = { fontFamily: MONO, fontSize: '9.5px', fontWeight: 900, letterSpacing: '0.32em', textTransform: 'uppercase' } as const

  const ring = (value: number, of: number, color: string, label: string) => {
    const pct = of > 0 ? Math.round((value / of) * 100) : 0
    return (
      <div key={label} className="flex-1 text-center">
        <div style={{ width: '74px', height: '74px', borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center',
          background: `conic-gradient(${color} ${pct}%, ${TECH.line} 0)`, boxShadow: `0 0 18px ${color}33` }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: TECH.bg, display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '22px', color }}>{value}</div>
        </div>
        <p style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: TECH.dim, marginTop: '8px', lineHeight: 1.35 }}>{label}</p>
      </div>
    )
  }

  const bars = (p: SelectionPlayer) => {
    const recent = p.rounds.slice(-8)
    return (
      <div className="shrink-0" style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '32px', width: '66px', position: 'relative' }}
        aria-label={`Points by round: ${recent.map(r => `Round ${r.round} ${typeof r.points === 'number' ? r.points : 'did not play'}`).join(', ')}`}>
        {recent.map(r => {
          const played = typeof r.points === 'number'
          const h = played ? Math.max(8, ((r.points as number) / scale) * 100) : 0
          const over = played && (r.points as number) >= room.par
          return (
            <i key={r.round} style={{
              flex: 1, borderRadius: '2px', display: 'block',
              height: played ? `${Math.min(100, h)}%` : '3px',
              background: !played ? (r.points === null ? `${TECH.warn}88` : `${TECH.dim}40`) : over ? gradUp : `${TECH.cyan}40`,
              boxShadow: over ? `0 0 8px ${TECH.glow}` : 'none',
            }} />
          )
        })}
        <span style={{ position: 'absolute', left: '-3px', right: '-3px', bottom: `${parPct}%`, borderTop: `1px dashed ${TECH.dim}` }} />
      </div>
    )
  }

  function nextLine(p: SelectionPlayer) {
    const r = room.nextRound
    const game = p.next.opponent ? `v ${p.next.opponent}${p.next.when ? `, ${p.next.when}` : ''}` : ''
    switch (p.next.status) {
      case 'named':
        return <><b style={{ color: TECH.ok }}>Named by the coach</b> for Round {r}{p.next.batOrder ? `, batting ${ordinal(p.next.batOrder)}` : ''}{game ? ` (${game})` : ''}.</>
      case 'not_named':
        return <><b style={{ color: TECH.warn }}>Not in the named team</b> for Round {r}. The coach has sent a lineup without them.</>
      case 'out':
        return <><b style={{ color: TECH.warn }}>Unavailable</b> for Round {r}.</>
      case 'bye':
        return <><b style={{ color: TECH.warn }}>Bye.</b> {p.club || 'Their club'} is not playing in Round {r}.</>
      default:
        return r == null ? <>No round is open to pick for.</>
          : <>{game ? <>Plays {game}. </> : null}The coach has not named a team for Round {r} yet.</>
    }
  }

  const spot = (label: string, color: string, p: SelectionPlayer, text: string) => {
    return (
      <button key={label} type="button" onClick={() => { setSort('best'); setShowAll(true); setOpen(p.id) }}
        className="text-left transition-all hover:brightness-125" style={{ ...panel, padding: '12px 13px', minHeight: '44px' }}>
        <p className="flex items-center gap-1.5" style={{ ...eyebrow, fontSize: '8.5px', letterSpacing: '0.2em', color }}>
          <i style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, display: 'block' }} />
          {label}
        </p>
        <p style={{ fontSize: '14.5px', fontWeight: 900, color: TECH.text, margin: '8px 0 3px' }}>{name(p.name)}</p>
        <p style={{ fontSize: '10.5px', lineHeight: 1.4, color: TECH.dim }}>{text}</p>
      </button>
    )
  }

  const { reliable, hot, cold, out } = room.spotlight
  const hasSpot = reliable || hot || cold || out

  return (
    <div>
      {/* Squad scan */}
      <div style={{ ...panel, borderColor: TECH.cyan, padding: '18px 14px', marginBottom: '22px',
        boxShadow: `0 0 0 1px ${TECH.cyan} inset, 0 0 26px ${TECH.glow}, 0 0 60px ${TECH.cyan}22` }}>
        <p style={{ ...eyebrow, color: TECH.cyan }}>Squad scan · {squad} cards</p>
        <div className="flex gap-1.5" style={{ marginTop: '14px' }}>
          {ring(room.scan.everPresent, squad, TECH.cyan, 'ever-present')}
          {ring(room.scan.beatParMost, squad, TECH.ok, 'beat par most weeks')}
          {ring(room.scan.doubtful, squad, TECH.warn, room.nextRound != null ? `doubtful for R${room.nextRound}` : 'doubtful')}
        </div>
        <p style={{ fontFamily: MONO, fontSize: '10px', lineHeight: 1.55, color: TECH.dim, marginTop: '14px', borderTop: `1px solid ${TECH.line}`, paddingTop: '11px' }}>
          <b style={{ color: TECH.cyan }}>PAR {fmt(room.par)}</b> · what a starter in your team scores in a typical round.
          The dashed line on every chart.
        </p>
      </div>

      {/* Spotlight */}
      {hasSpot && (
        <>
          <p style={{ ...eyebrow, color: TECH.dim, marginBottom: '9px' }}>Spotlight</p>
          <div className="grid grid-cols-2 gap-2.5" style={{ marginBottom: '18px' }}>
            {reliable && spot('Mr Reliable', TECH.ok, reliable,
              `Played ${reliable.played} of ${reliable.clubRounds}. Beat par in ${reliable.beatPar}.`)}
            {hot && spot('Hot hand', second, hot, `Last 3 average ${fmt(hot.last3)}, up from ${fmt(hot.avg)}.`)}
            {cold && spot('Going cold', TECH.warn, cold, `Last 3 average ${fmt(cold.last3)}, down from ${fmt(cold.avg)}.`)}
            {out && spot('Sitting out', TECH.dim, out,
              out.next.status === 'bye' ? `Club has the bye in Round ${room.nextRound}.` : `Unavailable for Round ${room.nextRound}.`)}
          </div>
        </>
      )}

      {/* Sort */}
      <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '11px' }}>
        {SORTS.map(s => {
          const on = sort === s.key
          return (
            <button key={s.key} type="button" onClick={() => { setSort(s.key); setShowAll(false) }} aria-pressed={on}
              style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                borderRadius: '7px', padding: '0 11px', minHeight: '36px',
                border: on ? '1px solid transparent' : `1px solid ${TECH.line}`,
                background: on ? grad : 'transparent', color: on ? TECH.on : TECH.dim,
                boxShadow: on ? `0 0 18px ${TECH.glow}` : 'none' }}>
              {s.label}
            </button>
          )
        })}
      </div>

      {/* The board */}
      <div style={{ ...panel, overflow: 'hidden' }}>
        {shown.length === 0 && (
          <p style={{ padding: '22px 16px', fontSize: '12px', color: TECH.dim, textAlign: 'center' }}>No pitchers in your squad.</p>
        )}
        {shown.map((p, i) => {
          const v = VERDICT[p.verdict]
          const tone = toneOf(v.tone)
          const isOpen = open === p.id
          const faded = p.verdict === 'sitting_out'
          const sub = [p.club, p.positions.join('/'),
            p.next.status === 'bye' ? 'Bye' : p.next.opponent ? `v ${p.next.opponent}` : ''].filter(Boolean).join(' · ')
          return (
            <div key={p.id} style={{ borderBottom: i === shown.length - 1 && !isOpen ? 'none' : `1px solid ${TECH.line}` }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}
                className="w-full text-left flex items-center gap-2.5 transition-all hover:brightness-125"
                style={{ padding: '12px 13px', opacity: faded && !isOpen ? 0.6 : 1 }}>
                <span className="shrink-0" style={{ width: '22px', height: '22px', borderRadius: '6px', display: 'grid', placeItems: 'center',
                  fontFamily: MONO, fontSize: '11px', fontWeight: 900,
                  background: i === 0 && sort !== 'pitchers' ? TECH.cyan : 'transparent',
                  color: i === 0 && sort !== 'pitchers' ? TECH.on : TECH.dim,
                  border: i === 0 && sort !== 'pitchers' ? 'none' : `1px solid ${TECH.line}`,
                  boxShadow: i === 0 && sort !== 'pitchers' ? `0 0 14px ${TECH.glow}` : 'none' }}>{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ fontSize: '13.5px', fontWeight: 800, color: TECH.text }}>{name(p.name)}</span>
                  <span className="block truncate" style={{ fontFamily: MONO, fontSize: '9.5px', color: TECH.dim, marginTop: '2px', textTransform: 'uppercase' }}>{sub}</span>
                  <span style={{ display: 'inline-block', fontFamily: MONO, fontSize: '8px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                    borderRadius: '4px', padding: '3px 7px', marginTop: '6px', color: tone, border: `1px solid ${tone}`, background: `${tone}22` }}>{v.label}</span>
                </span>
                {bars(p)}
                <span className="shrink-0 text-right" style={{ width: '46px' }}>
                  <b style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', color: TECH.cyan, textShadow: `0 0 14px ${TECH.glow}` }}>{p.played ? fmt(p.avg) : '—'}</b>
                  <span className="block" style={{ fontFamily: MONO, fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', color: TECH.dim }}>AVG</span>
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: '4px 13px 15px', background: `linear-gradient(180deg, ${TECH.cyan}14, transparent)` }}>
                  <div className="grid grid-cols-4 gap-1.5" style={{ marginBottom: '11px' }}>
                    {[
                      { k: 'played', v: `${p.played}/${p.clubRounds}` },
                      { k: 'beat par', v: `${p.beatPar}/${p.played}` },
                      { k: 'last 3', v: p.played ? fmt(p.last3) : '—', hi: true },
                      { k: 'range', v: p.played ? `${fmt(p.low)}–${fmt(p.high)}` : '—' },
                    ].map(x => (
                      <div key={x.k} className="text-center" style={{ border: `1px solid ${TECH.line}`, borderRadius: '9px', padding: '9px 4px', background: TECH.bg }}>
                        <b className="block" style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: x.hi ? TECH.cyan : TECH.text }}>{x.v}</b>
                        <span style={{ fontFamily: MONO, fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TECH.dim }}>{x.k}</span>
                      </div>
                    ))}
                  </div>

                  {/* Round by round */}
                  <div className="flex flex-wrap gap-1" style={{ marginBottom: '12px' }}>
                    {p.rounds.map(r => {
                      const played = typeof r.points === 'number'
                      const over = played && (r.points as number) >= room.par
                      return (
                        <div key={r.round} className="text-center" style={{ minWidth: '38px', flex: '1 0 38px', borderRadius: '8px', padding: '6px 0',
                          background: TECH.bg, border: `1px solid ${over ? `${TECH.cyan}66` : TECH.line}` }}>
                          <span className="block" style={{ fontFamily: MONO, fontSize: '8px', color: TECH.dim, marginBottom: '2px' }}>R{r.round}</span>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: !played ? TECH.dim : over ? TECH.cyan : TECH.text }}>
                            {played ? fmt(r.points as number) : r.points === null ? 'DNP' : '·'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <p style={{ fontFamily: MONO, fontSize: '8.5px', letterSpacing: '0.14em', color: TECH.dim }}>
                    PICK RATING <b style={{ color: TECH.cyan, float: 'right' }}>{p.confidence}%</b>
                  </p>
                  <div style={{ height: '5px', borderRadius: '9px', background: TECH.line, overflow: 'hidden', marginTop: '8px' }}>
                    <i style={{ display: 'block', height: '100%', width: `${p.confidence}%`, background: grad, boxShadow: `0 0 10px ${TECH.glow}` }} />
                  </div>

                  <p style={{ fontSize: '11px', lineHeight: 1.55, color: TECH.dim, marginTop: '12px' }}>{nextLine(p)}</p>
                  {(p.use.started + p.use.bench + p.use.reserves) > 0 && (
                    <p style={{ fontSize: '11px', lineHeight: 1.55, color: TECH.dim, marginTop: '4px' }}>
                      Your use so far: started {p.use.started}, bench {p.use.bench}, reserves {p.use.reserves}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {list.length > SHOWN && (
        <button type="button" onClick={() => setShowAll(!showAll)}
          className="w-full transition-all hover:brightness-125"
          style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: TECH.cyan, border: `1px solid ${TECH.line}`, borderRadius: '10px', minHeight: '44px', marginTop: '10px', background: 'transparent' }}>
          {showAll ? 'Show fewer' : `Show all ${list.length}`}
        </button>
      )}

      <p style={{ fontSize: '10.5px', lineHeight: 1.55, color: TECH.dim, textAlign: 'center', marginTop: '14px' }}>
        Tap a player for the full breakdown. Bars are points by round; a red tick is a game their club played without them.
        The pick rating weighs turning up, beating par, recent form and season average, then checks the coach&apos;s named team.
      </p>
    </div>
  )
}
