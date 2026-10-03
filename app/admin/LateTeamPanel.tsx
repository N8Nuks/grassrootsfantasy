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

const field = { background: P.ink, border: `1px solid ${P.purple}40`, color: P.text }

type ClubRow = { club_id: string; club: string }
type GradeBlock = { grade: 'mens' | 'womens'; round_number: number | null; clubs: ClubRow[] }

export default function LateTeamPanel() {
  const [grades, setGrades] = useState<GradeBlock[] | null>(null)
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [clubId, setClubId] = useState('')
  const [round, setRound] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    fetch('/api/coach-links', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.grades) setGrades(d.grades as GradeBlock[]) })
      .catch(() => setGrades([]))
  }, [])

  const block = grades?.find(g => g.grade === grade)

  useEffect(() => {
    if (!block) return
    setClubId(block.clubs[0]?.club_id ?? '')
    setRound(block.round_number != null ? String(block.round_number) : '')
  }, [grades, grade]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setBusy(true)
    setLog([])
    setIsError(false)
    try {
      const res = await fetch('/api/late-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, club_id: clubId, round_number: Number(round), text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setIsError(true)
        setLog(String(data.error ?? 'That didn\'t load').split('\n'))
      } else {
        const lines = [
          `Loaded ${data.club}, Round ${data.round_number}: ${data.batters} batters${data.relievers ? ` and ${data.relievers} relief` : ''}.`,
        ]
        if (data.not_in_gf?.length) {
          lines.push(`Stored by name, not in GF: ${data.not_in_gf.join(', ')}`)
        }
        lines.push('Press Refresh in Coach Links to see it marked as sent.')
        setLog(lines)
        setText('')
      }
    } catch {
      setIsError(true)
      setLog(['That didn\'t load. Check your connection and try again.'])
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl" style={{
      background: P.panel, border: `1px solid ${P.panelEdge}`,
      padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.blue}0E`,
    }}>
      <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue, marginBottom: '6px' }}>
        5c · Load a Late Team
      </p>
      <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>
        For a team a coach sends you outside the link. One player per line as player,order,pos. Order is 1 to 9, 10 or FL for a Flex, and blank for a relief pitcher (P2). It replaces any team already loaded for that club and round.
      </p>

      <div className="flex gap-4 flex-wrap" style={{ marginBottom: '16px' }}>
        <select value={grade} onChange={e => setGrade(e.target.value as 'mens' | 'womens')}
          className="rounded-xl px-4 py-3.5 text-sm" style={field}>
          <option value="mens">Men&apos;s</option>
          <option value="womens">Women&apos;s</option>
        </select>
        <select value={clubId} onChange={e => setClubId(e.target.value)}
          className="rounded-xl px-4 py-3.5 text-sm flex-1" style={{ ...field, minWidth: '180px' }}>
          {(block?.clubs ?? []).map(c => <option key={c.club_id} value={c.club_id}>{c.club}</option>)}
        </select>
        <input type="number" value={round} onChange={e => setRound(e.target.value)}
          onFocus={e => e.currentTarget.select()} onWheel={e => e.currentTarget.blur()}
          placeholder="Round #" className="rounded-xl px-4 py-3.5 text-sm w-32" style={field} />
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder={"Brock Evans,1,IF\nRyan Earley,2,OF\nFloyd Nola,3,P\n…\nSam Thompson,,P2"}
        rows={11} className="w-full rounded-xl px-4 py-3.5 text-xs font-mono" style={field} />

      <div className="text-center" style={{ marginTop: '22px' }}>
        <button type="button" onClick={load} disabled={busy || !text.trim() || !clubId || !round.trim()}
          className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
          style={{ color: P.green, border: `1px solid ${P.green}`, background: 'transparent', padding: '16px 44px' }}>
          {busy ? 'Working…' : 'Load team'}
        </button>
      </div>

      {log.length > 0 && (
        <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{
          marginTop: '20px', padding: '20px 24px', background: P.ink,
          border: `1px solid ${isError ? P.red + '50' : P.blue + '30'}`,
          color: isError ? P.red : P.green,
        }}>
          {log.join('\n')}
        </pre>
      )}
    </div>
  )
}