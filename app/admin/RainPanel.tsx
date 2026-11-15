'use client'
import { useEffect, useState } from 'react'

const P = {
  purple: '#8B5CF6',
  blue: '#7DD3FC',
  green: '#4ADE80',
  red: '#FF6B6B',
  orange: '#FB923C',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}
const field = { background: P.ink, border: `1px solid ${P.purple}40`, color: P.text }

type Grade = 'mens' | 'womens'
type Round = { round_number: number; status: string }
type Game = {
  id: string; round_number: number; played_on: string; start_time: string | null
  club_a: string; club_b: string; location: string | null; venue: string | null
  score_a: number | null; score_b: number | null; catchup: boolean | null
}
type Draft = { date: string; time: string; park: string }

const STATUS: Record<string, string> = {
  open: 'Open', locked: 'Locked', provisional: 'Scored (provisional)', confirmed: 'Confirmed', catchup: 'Non-scoring',
}
const hhmm = (t: string | null) => (!t || t.startsWith('23:59') ? '' : t.slice(0, 5))

/* Rain tools: make a round non-scoring, or move single games to the Catch-up
   games card. Lives outside AdminClient so typing in a field never rebuilds
   the rest of the page. */
export default function RainPanel() {
  const [grade, setGrade] = useState<Grade>('mens')
  const [rounds, setRounds] = useState<Round[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [round, setRound] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [isError, setIsError] = useState(false)

  // Reload on a grade change and after every action. The picked round is kept
  // when it still exists; otherwise the latest round is picked.
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/rain?grade=${grade}`, { cache: 'no-store' })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return
        if (!ok) { setIsError(true); setLog([d.error ?? 'Could not load rounds']); return }
        const rs = (d.rounds ?? []) as Round[]
        setRounds(rs)
        setGames((d.games ?? []) as Game[])
        setRound(prev => (prev != null && rs.some(r => r.round_number === prev)
          ? prev : rs.length ? rs[rs.length - 1].round_number : null))
        setDrafts({})
      })
      .catch(() => { if (!cancelled) { setIsError(true); setLog(['Could not load rounds. Check your connection.']) } })
    return () => { cancelled = true }
  }, [grade, refresh])

  const current = rounds.find(r => r.round_number === round) ?? null
  const roundGames = games.filter(g => g.round_number === round)
  const draftOf = (g: Game): Draft => drafts[g.id] ?? {
    date: g.catchup ? g.played_on : '', time: g.catchup ? hhmm(g.start_time) : '', park: g.catchup ? (g.location ?? '') : '',
  }
  const setDraft = (g: Game, patch: Partial<Draft>) => setDrafts(prev => ({ ...prev, [g.id]: { ...draftOf(g), ...patch } }))

  async function post(payload: Record<string, unknown>, done: (d: Record<string, unknown>) => string) {
    setBusy(true); setLog([]); setIsError(false)
    try {
      const res = await fetch('/api/rain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) { setIsError(true); setLog([d.error ?? 'That didn\'t work']) }
      else { setLog([done(d)]); setRefresh(n => n + 1) }
    } catch {
      setIsError(true); setLog(['That didn\'t work. Check your connection and try again.'])
    }
    setConfirming(false); setBusy(false)
  }

  const scored = current ? ['provisional', 'confirmed'].includes(current.status) : false
  const btn = (color: string) => ({
    color, border: `1px solid ${color}`, background: 'transparent', padding: '0 18px', minHeight: '44px',
  })

  return (
    <div className="rounded-2xl" style={{
      background: P.panel, border: `1px solid ${P.panelEdge}`,
      padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.blue}0E`,
    }}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue, marginBottom: '6px' }}>
        3b · Rain and Catch-up Games
      </p>
      <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>
        For rained-off games. Make a whole round non-scoring, or move single games to the Catch-up games card.
        Either way the stats still go on the players&apos; cards when you upload them, and user teams get no points for them.
      </p>

      <div className="flex gap-4 flex-wrap" style={{ marginBottom: '18px' }}>
        <select value={grade} onChange={e => { setGrade(e.target.value as Grade); setRound(null); setConfirming(false); setLog([]) }}
          aria-label="Grade" className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
          <option value="mens">Men&apos;s</option>
          <option value="womens">Women&apos;s</option>
        </select>
        <select value={round ?? ''} onChange={e => { setRound(Number(e.target.value)); setConfirming(false); setLog([]) }}
          aria-label="Round" className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
          {rounds.length === 0 && <option value="">No rounds yet</option>}
          {rounds.map(r => (
            <option key={r.round_number} value={r.round_number}>Round {r.round_number} · {STATUS[r.status] ?? r.status}</option>
          ))}
        </select>
      </div>

      {current && (
        <>
          {/* The whole round */}
          <div className="rounded-xl" style={{ background: P.ink, border: `1px solid ${P.purple}30`, padding: '16px 18px', marginBottom: '18px' }}>
            <p className="text-xs font-black" style={{ color: P.text, marginBottom: '6px' }}>
              Whole round: {current.status === 'catchup' ? 'non-scoring' : 'counts for GF teams'}
            </p>
            {current.status === 'catchup' ? (
              <>
                <p className="text-xs" style={{ color: P.dim, marginBottom: '12px' }}>
                  Round {current.round_number} gives user teams no points and has no head-to-head. Upload its stats as Round {current.round_number} as usual.
                </p>
                <button type="button" disabled={busy}
                  onClick={() => post({ action: 'undo_non_scoring', grade, round_number: current.round_number },
                    d => `Round ${current.round_number} counts for GF teams again (${STATUS[String(d.status)] ?? d.status}).`)}
                  className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40" style={btn(P.dim)}>
                  Switch back to a normal round
                </button>
              </>
            ) : scored ? (
              <p className="text-xs" style={{ color: P.dim }}>
                Round {current.round_number} has been scored, so it stays a normal round. Move any unplayed games to catch-up below.
              </p>
            ) : !confirming ? (
              <>
                <p className="text-xs" style={{ color: P.dim, marginBottom: '12px' }}>
                  Use when the round is called off for GF. User teams get no points, head-to-head is skipped, and the next round carries on as normal.
                </p>
                <button type="button" disabled={busy} onClick={() => setConfirming(true)}
                  className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40" style={btn(P.orange)}>
                  Make Round {current.round_number} non-scoring
                </button>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: P.orange, marginBottom: '12px' }}>
                  Round {current.round_number} ({grade === 'mens' ? 'Men\'s' : 'Women\'s'}) will give user teams no points and its matchups will be removed. Sure?
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button type="button" disabled={busy}
                    onClick={() => post({ action: 'non_scoring', grade, round_number: current.round_number },
                      () => `Round ${current.round_number} is now non-scoring. Move its unplayed games to catch-up below, then press Next Round in Round Control when you are ready to open the next one.`)}
                    className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40"
                    style={{ color: P.ink, background: P.orange, padding: '0 18px', minHeight: '44px' }}>
                    {busy ? 'Working…' : 'Yes, make it non-scoring'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirming(false)}
                    className="text-xs font-black uppercase tracking-widest rounded-full" style={btn(P.dim)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Single games */}
          <p className="text-xs font-black" style={{ color: P.text, marginBottom: '4px' }}>Games in Round {current.round_number}</p>
          <p className="text-xs" style={{ color: P.dim, marginBottom: '12px' }}>
            Move a rained-off game to catch-up. Leave the date blank if it isn&apos;t known and it shows as TBC.
            {!scored && current.status !== 'catchup' ? ' Both clubs\' players are marked unavailable for this round.' : ''}
          </p>
          {roundGames.length === 0 && <p className="text-xs" style={{ color: P.dim }}>No games loaded for this round.</p>}
          {roundGames.map(g => {
            const d = draftOf(g)
            const played = g.score_a != null && g.score_b != null
            return (
              <div key={g.id} className="rounded-xl" style={{ background: P.ink, border: `1px solid ${g.catchup ? P.blue + '60' : P.purple + '30'}`, padding: '14px 16px', marginBottom: '10px' }}>
                <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '10px' }}>
                  <p className="text-sm font-bold flex-1" style={{ color: P.text, minWidth: '200px' }}>
                    {g.club_a} v {g.club_b}{played ? ` (${g.score_a}–${g.score_b})` : ''}
                  </p>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: g.catchup ? P.blue : P.dim }}>
                    {g.catchup ? 'Catch-up' : `${g.played_on}${hhmm(g.start_time) ? ` ${hhmm(g.start_time)}` : ''}`}
                  </span>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                  <input type="date" value={d.date} onChange={e => setDraft(g, { date: e.target.value })}
                    aria-label="New date" title="New date. Blank shows as TBC."
                    className="rounded-xl px-3 text-sm" style={{ ...field, minHeight: '44px' }} />
                  <input type="time" value={d.time} onChange={e => setDraft(g, { time: e.target.value })}
                    aria-label="Start time" title="Start time. Blank shows the date only."
                    className="rounded-xl px-3 text-sm" style={{ ...field, minHeight: '44px' }} />
                  <input type="text" value={d.park} onChange={e => setDraft(g, { park: e.target.value })}
                    placeholder="Park (optional)" aria-label="Park"
                    className="rounded-xl px-3 text-sm flex-1" style={{ ...field, minHeight: '44px', minWidth: '140px' }} />
                  <button type="button" disabled={busy}
                    onClick={() => post({ action: 'move', fixture_id: g.id, date: d.date || null, time: d.time || null, park: d.park || null },
                      r => `${g.club_a} v ${g.club_b} ${g.catchup ? 'updated' : 'moved to catch-up'}${d.date ? `, ${d.date}` : ', date TBC'}.${Number(r.marked) > 0 ? ` ${r.marked} players marked unavailable for Round ${g.round_number}.` : ''}`)}
                    className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40" style={btn(P.green)}>
                    {g.catchup ? 'Save' : 'Move to catch-up'}
                  </button>
                  {g.catchup && (
                    <button type="button" disabled={busy}
                      onClick={() => post({ action: 'restore', fixture_id: g.id },
                        () => `${g.club_a} v ${g.club_b} is back in Round ${g.round_number}. Check its date on the Fixtures page.`)}
                      className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40" style={btn(P.dim)}>
                      Back to round
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {log.length > 0 && (
        <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{
          marginTop: '18px', padding: '18px 22px', background: P.ink,
          border: `1px solid ${isError ? P.red + '50' : P.blue + '30'}`,
          color: isError ? P.red : P.green,
        }}>
          {log.join('\n')}
        </pre>
      )}
    </div>
  )
}
