'use client'
import { useEffect, useState } from 'react'

const P = {
  purple: '#8B5CF6',
  blue: '#7DD3FC',
  green: '#4ADE80',
  red: '#FF6B6B',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}

type ClubRow = { club_id: string; club: string; token: string; submitted_at: string | null; bye: boolean }
type GradeBlock = { grade: 'mens' | 'womens'; round_number: number | null; closes_at: string | null; clubs: ClubRow[] }

const WHEN = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  timeZone: 'Pacific/Auckland',
})

const small = {
  fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
  borderRadius: '999px', background: 'transparent', padding: '7px 16px',
}

export default function CoachLinksPanel() {
  const [grades, setGrades] = useState<GradeBlock[] | null>(null)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setErr('')
    try {
      const res = await fetch('/api/coach-links', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Could not load the links'); return }
      setGrades(data.grades as GradeBlock[])
    } catch {
      setErr('Could not load the links')
    }
  }
  useEffect(() => { load() }, [])

  const url = (token: string) => `${window.location.origin}/coach/${token}`

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNote(`Copied ${what}`)
    } catch {
      setNote('Could not copy. Select the text and copy it by hand')
    }
  }

  async function regenerate(grade: 'mens' | 'womens', c: ClubRow) {
    if (!window.confirm(`Issue a new link for ${c.club}? The old link stops working straight away.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/coach-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', grade, club_id: c.club_id }),
      })
      const data = await res.json()
      if (!res.ok) { setNote(data.error ?? 'Could not issue a new link'); setBusy(false); return }
      setGrades(prev => (prev ?? []).map(g => g.grade !== grade ? g : {
        ...g, clubs: g.clubs.map(x => x.club_id === c.club_id ? { ...x, token: data.token } : x),
      }))
      setNote(`New link issued for ${c.club}`)
    } catch {
      setNote('Could not issue a new link')
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl" style={{
      background: P.panel, border: `1px solid ${P.panelEdge}`,
      padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.blue}0E`,
    }}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue, marginBottom: '6px' }}>
        5b · Coach Links
      </p>
      <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>
        One private link per club per grade. Coaches name their team for the next round and flag who is unavailable. The link always shows the next open round.
      </p>

      {note && <p className="text-xs" style={{ color: P.green, marginBottom: '14px' }}>{note}</p>}
      {err && <p className="text-xs" style={{ color: P.red, marginBottom: '14px' }}>{err}</p>}
      {!grades && !err && <p className="text-xs" style={{ color: P.dim }}>Loading…</p>}

      {grades?.map(g => {
        const sent = g.clubs.filter(c => c.submitted_at).length
        const expected = g.clubs.filter(c => !c.bye).length
        const label = g.grade === 'mens' ? "Men's" : "Women's"
        return (
          <div key={g.grade} className="rounded-xl" style={{ marginTop: '14px', padding: '16px 20px', background: P.ink, border: `1px solid ${P.purple}30` }}>
            <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginBottom: '10px' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue }}>
                  {label}{g.round_number != null ? ` · Round ${g.round_number}` : ''}{g.round_number != null ? ` · ${sent} of ${expected} submitted` : ''}
                </p>
                {g.closes_at && (
                  <p className="text-xs" style={{ color: P.dim, marginTop: '4px' }}>Coaches close {WHEN.format(new Date(g.closes_at))}</p>
                )}
                {g.round_number == null && (
                  <p className="text-xs" style={{ color: P.dim, marginTop: '4px' }}>No upcoming round in the fixtures</p>
                )}
              </div>
              <button type="button" disabled={busy}
                onClick={() => copy(g.clubs.map(c => `${c.club}: ${url(c.token)}`).join('\n'), `all ${label} links`)}
                style={{ ...small, color: P.blue, border: `1px solid ${P.blue}70` }}>
                Copy all
              </button>
            </div>

            {g.clubs.map(c => (
              <div key={c.club_id} className="flex items-center justify-between gap-3 flex-wrap"
                style={{ padding: '10px 0', borderTop: `1px solid ${P.purple}20` }}>
                <span className="text-sm font-bold" style={{ color: P.text }}>
                  {c.club}
                  <span style={{
                    marginLeft: '10px', fontSize: '11px', fontWeight: 400,
                    color: c.submitted_at ? P.green : c.bye ? P.dim : P.dim,
                  }}>
                    {c.submitted_at ? `Submitted ${WHEN.format(new Date(c.submitted_at))}` : c.bye ? 'Bye round' : 'Not submitted'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => copy(url(c.token), `${c.club} link`)}
                    style={{ ...small, color: P.green, border: `1px solid ${P.green}70` }}>
                    Copy link
                  </button>
                  <button type="button" disabled={busy} onClick={() => regenerate(g.grade, c)}
                    style={{ ...small, color: P.red, border: `1px solid ${P.red}70` }}>
                    New link
                  </button>
                </span>
              </div>
            ))}
          </div>
        )
      })}

      <div className="text-center" style={{ marginTop: '18px' }}>
        <button type="button" onClick={load} disabled={busy}
          style={{ ...small, color: P.text, border: `1px solid ${P.purple}70` }}>
          Refresh
        </button>
      </div>
    </div>
  )
}