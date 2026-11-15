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
type Manager = {
  id: string; team: string; email: string | null; joined: string | null
  last_saved: string | null; last_set_round: number | null; rounds_since: number | null
  packs_opened: number; last_pack_round: number | null; last_sign_in: string | null
}
type Trend = { round_number: number; status: string; teams: number; set: number; packs: number }
type Data = {
  round: { round_number: number; status: string } | null
  pack_rounds: number
  summary: { teams: number; this_round: number; last_round: number; coasting: number; quiet: number } | null
  trend: Trend[]
  managers: Manager[]
}

type Bucket = 'all' | 'this' | 'last' | 'coasting' | 'quiet'
const bucketOf = (m: Manager): Exclude<Bucket, 'all'> =>
  m.rounds_since == null || m.rounds_since >= 4 ? 'quiet'
    : m.rounds_since >= 2 ? 'coasting' : m.rounds_since === 1 ? 'last' : 'this'
const TONE: Record<Exclude<Bucket, 'all'>, string> = { this: P.green, last: P.blue, coasting: P.orange, quiet: P.red }

const DAY = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })
const day = (iso: string | null) => (iso ? DAY.format(new Date(iso)) : 'never')
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

/* Who is still playing. Lives outside AdminClient so it loads on its own and
   never slows the rest of the page. */
export default function ActivityPanel() {
  const [grade, setGrade] = useState<Grade>('mens')
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState<Bucket>('quiet')
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [loadedKey, setLoadedKey] = useState('')

  const key = `${grade}:${refresh}`
  useEffect(() => {
    let cancelled = false
    fetch(`/api/manager-activity?grade=${grade}`, { cache: 'no-store' })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return
        if (ok) { setData(d as Data); setError(null) } else { setData(null); setError(d.error ?? 'Could not load') }
        setLoadedKey(`${grade}:${refresh}`)
      })
      .catch(() => { if (!cancelled) { setData(null); setError('Could not load. Check your connection.'); setLoadedKey(`${grade}:${refresh}`) } })
    return () => { cancelled = true }
  }, [grade, refresh])
  const loading = loadedKey !== key

  const s = data?.summary ?? null
  const cur = data?.round?.round_number ?? null
  const list = (data?.managers ?? []).filter(m => bucket === 'all' || bucketOf(m) === bucket)
  const SHOWN = 25
  const shown = showAll ? list : list.slice(0, SHOWN)
  const emails = list.map(m => m.email).filter((e): e is string => !!e)

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { setError('Could not copy. Select the emails in the list instead.') }
  }

  const pills: { key: Bucket; label: string; n: number; color: string }[] = s ? [
    { key: 'quiet', label: 'Gone quiet', n: s.quiet, color: P.red },
    { key: 'coasting', label: 'Coasting', n: s.coasting, color: P.orange },
    { key: 'last', label: 'Set last round', n: s.last_round, color: P.blue },
    { key: 'this', label: 'Set this round', n: s.this_round, color: P.green },
    { key: 'all', label: 'Everyone', n: s.teams, color: P.purple },
  ] : []

  return (
    <div className="rounded-2xl" style={{
      background: P.panel, border: `1px solid ${P.panelEdge}`,
      padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.green}0E`,
    }}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.green, marginBottom: '6px' }}>
        9 · Manager Activity
      </p>
      <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>
        Who is still playing. A lineup counts as set when the manager saved it after the round before locked; a lineup that only carried forward does not.
        A pack counts as opened when the manager opened it, not when it was dealt for them at Next Round.
      </p>

      <div className="flex gap-4 flex-wrap" style={{ marginBottom: '18px' }}>
        <select value={grade} onChange={e => { setGrade(e.target.value as Grade); setShowAll(false) }}
          aria-label="Grade" className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
          <option value="mens">Men&apos;s</option>
          <option value="womens">Women&apos;s</option>
        </select>
        <button type="button" onClick={() => setRefresh(n => n + 1)} disabled={loading}
          className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40"
          style={{ color: P.blue, border: `1px solid ${P.blue}`, padding: '0 22px', minHeight: '44px' }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <pre className="rounded-xl text-xs whitespace-pre-wrap" style={{ padding: '16px 20px', background: P.ink, border: `1px solid ${P.red}50`, color: P.red }}>{error}</pre>
      )}
      {!error && !data && <p className="text-xs" style={{ color: P.dim }}>Loading…</p>}
      {data && !s && <p className="text-xs" style={{ color: P.dim }}>No rounds for this grade yet.</p>}

      {data && s && (
        <div style={{ opacity: loading ? 0.5 : 1 }}>
          {/* Headline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: '18px' }}>
            {[
              { label: 'Teams', value: String(s.teams), color: P.text },
              { label: `Set for R${cur}`, value: `${s.this_round}`, sub: `${pct(s.this_round, s.teams)}%`, color: P.green },
              { label: 'Coasting 2–3 rounds', value: `${s.coasting}`, sub: `${pct(s.coasting, s.teams)}%`, color: P.orange },
              { label: 'Quiet 4+ rounds', value: `${s.quiet}`, sub: `${pct(s.quiet, s.teams)}%`, color: P.red },
            ].map(t => (
              <div key={t.label} className="rounded-xl text-center" style={{ background: P.ink, border: `1px solid ${P.purple}30`, padding: '14px 8px' }}>
                <p className="text-2xl font-black" style={{ color: t.color, fontFamily: 'var(--font-heading)' }}>
                  {t.value}{t.sub && <span className="text-xs font-bold" style={{ color: P.dim }}> {t.sub}</span>}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.dim, marginTop: '5px' }}>{t.label}</p>
              </div>
            ))}
          </div>

          {/* Round by round */}
          <p className="text-xs font-black" style={{ color: P.text, marginBottom: '4px' }}>Round by round</p>
          <p className="text-xs" style={{ color: P.dim, marginBottom: '12px' }}>
            Share of teams whose manager set a lineup for the round, and how many opened their pack. The current round is still filling.
          </p>
          <div className="rounded-xl" style={{ background: P.ink, border: `1px solid ${P.purple}30`, padding: '14px 16px', marginBottom: '22px' }}>
            {data.trend.length === 0 && <p className="text-xs" style={{ color: P.dim }}>No rounds played yet.</p>}
            {data.trend.map(t => (
              <div key={t.round_number} className="flex items-center gap-3" style={{ padding: '5px 0' }}>
                <span className="text-[11px] font-black shrink-0" style={{ color: P.dim, width: '30px' }}>R{t.round_number}</span>
                <span className="flex-1 rounded-full overflow-hidden" style={{ height: '10px', background: `${P.purple}25` }}
                  role="img" aria-label={`Round ${t.round_number}: ${t.set} of ${t.teams} lineups set`}>
                  <i style={{ display: 'block', height: '100%', width: `${pct(t.set, t.teams)}%`, background: t.round_number === cur ? P.blue : P.green }} />
                </span>
                <span className="text-[11px] font-bold shrink-0 text-right" style={{ color: P.text, width: '128px' }}>
                  {t.set}/{t.teams} · {pct(t.set, t.teams)}%
                  <span style={{ color: P.dim }}> · {t.packs} packs</span>
                </span>
              </div>
            ))}
          </div>

          {/* The list */}
          <div className="flex flex-wrap gap-2" style={{ marginBottom: '12px' }}>
            {pills.map(p => {
              const on = bucket === p.key
              return (
                <button key={p.key} type="button" aria-pressed={on} onClick={() => { setBucket(p.key); setShowAll(false) }}
                  className="text-[10px] font-black uppercase tracking-widest rounded-full"
                  style={{ color: on ? P.ink : p.color, background: on ? p.color : 'transparent', border: `1px solid ${p.color}`, padding: '0 14px', minHeight: '38px' }}>
                  {p.label} {p.n}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '12px' }}>
            <p className="text-xs flex-1" style={{ color: P.dim, minWidth: '180px' }}>
              {list.length} manager{list.length === 1 ? '' : 's'}{emails.length < list.length ? `, ${emails.length} with an email` : ''}.
            </p>
            <button type="button" onClick={copyEmails} disabled={emails.length === 0}
              className="text-xs font-black uppercase tracking-widest rounded-full disabled:opacity-40"
              style={{ color: copied ? P.ink : P.green, background: copied ? P.green : 'transparent', border: `1px solid ${P.green}`, padding: '0 18px', minHeight: '44px' }}>
              {copied ? 'Copied' : `Copy ${emails.length} emails`}
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: P.ink, border: `1px solid ${P.purple}30` }}>
            {shown.length === 0 && <p className="text-xs" style={{ color: P.dim, padding: '18px' }}>Nobody in this group.</p>}
            {shown.map((m, i) => {
              const b = bucketOf(m)
              return (
                <div key={m.id} style={{ padding: '12px 16px', borderBottom: i === shown.length - 1 ? 'none' : `1px solid ${P.purple}20` }}>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-sm font-bold flex-1" style={{ color: P.text, minWidth: '160px' }}>{m.team}</p>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: TONE[b] }}>
                      {m.last_set_round == null ? 'Never set a lineup'
                        : m.rounds_since === 0 ? `Set for R${cur}`
                        : `Last set R${m.last_set_round} · ${m.rounds_since} round${m.rounds_since === 1 ? '' : 's'} ago`}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: P.dim, marginTop: '4px', wordBreak: 'break-word' }}>
                    {m.email ?? 'no email'} · saved {day(m.last_saved)} · packs opened {m.packs_opened}/{data.pack_rounds}
                    {m.last_pack_round ? ` (last R${m.last_pack_round})` : ''} · signed in {day(m.last_sign_in)} · joined {day(m.joined)}
                  </p>
                </div>
              )
            })}
          </div>
          {list.length > SHOWN && (
            <button type="button" onClick={() => setShowAll(!showAll)}
              className="w-full text-xs font-black uppercase tracking-widest rounded-xl"
              style={{ color: P.blue, border: `1px solid ${P.purple}40`, minHeight: '44px', marginTop: '10px' }}>
              {showAll ? 'Show fewer' : `Show all ${list.length}`}
            </button>
          )}
          <p className="text-[11px]" style={{ color: P.dim, marginTop: '12px' }}>
            &quot;Signed in&quot; is the last time they typed their password. People stay logged in for weeks, so an old date here does not mean they are away.
          </p>
        </div>
      )}
    </div>
  )
}
