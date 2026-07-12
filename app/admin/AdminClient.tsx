'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { AdminStats } from './page'

export default function AdminClient({ stats }: { stats: AdminStats }) {
  const [csv, setCsv] = useState('')
  const [roundNumber, setRoundNumber] = useState('0')
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Score-only
  const [scoreRound, setScoreRound] = useState('0')
  const [scoreGrade, setScoreGrade] = useState<'mens' | 'womens'>('mens')
  const [scoreLog, setScoreLog] = useState<string[]>([])
  const [scoreBusy, setScoreBusy] = useState(false)

  // Availability
  const [availNames, setAvailNames] = useState('')
  const [availRound, setAvailRound] = useState('0')
  const [availGrade, setAvailGrade] = useState<'mens' | 'womens'>('mens')
  const [availLog, setAvailLog] = useState<string[]>([])
  const [availBusy, setAvailBusy] = useState(false)

  function addLog(s: string) { setLog(prev => [...prev, s]) }

  async function upload() {
    setBusy(true); setLog([])
    const res = await fetch('/api/upload-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, grade, round_number: Number(roundNumber) }),
    })
    const data = await res.json()
    if (!res.ok) { addLog('ERROR: ' + data.error); setBusy(false); return }
    if (data.overwriting > 0) addLog(`⚠ Round already had ${data.overwriting} stat rows — existing entries updated`)
    addLog(`Stats loaded: ${data.loaded} players. Unmatched names: ${data.unmatched?.length ?? 0}`)
    data.unmatched?.forEach((n: string) => addLog('  ⚠ no player match: ' + n))
    addLog('Now scoring the round…')
    const score = await fetch('/api/score-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: data.round_id }),
    })
    const sdata = await score.json()
    if (!score.ok) { addLog('SCORING ERROR: ' + sdata.error); setBusy(false); return }
    addLog(`Scored: ${sdata.players_scored} players, ${sdata.teams_scored} teams, ${sdata.matchups_resolved ?? 0} matchups. Done.`)
    setBusy(false)
  }

  async function scoreOnly() {
    setScoreBusy(true); setScoreLog([])
    const res = await fetch('/api/score-round-by-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grade: scoreGrade, round_number: Number(scoreRound) }),
    })
    const data = await res.json()
    if (!res.ok) { setScoreLog(['ERROR: ' + data.error]); setScoreBusy(false); return }
    setScoreLog([`Scored: ${data.players_scored} players, ${data.teams_scored} teams, ${data.matchups_resolved ?? 0} matchups. Done.`])
    setScoreBusy(false)
  }

  async function setAvailability(unavailable: boolean) {
    setAvailBusy(true); setAvailLog([])
    const res = await fetch('/api/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: availNames.split('\n').map(n => n.trim()).filter(Boolean),
        grade: availGrade,
        round_number: Number(availRound),
        unavailable,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setAvailLog(['ERROR: ' + data.error]); setAvailBusy(false); return }
    const lines = [`${unavailable ? 'Marked unavailable' : 'Marked available'}: ${data.marked}`]
    if (data.unmatched?.length) data.unmatched.forEach((n: string) => lines.push('  ⚠ no player match: ' + n))
    setAvailLog(lines)
    setAvailBusy(false)
  }
const [t2Log, setT2Log] = useState<string[]>([])
  const [t2Busy, setT2Busy] = useState(false)

  async function releaseT2(g: 'mens' | 'womens') {
    setT2Busy(true)
    const r = await fetch('/api/release-t2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: g }) })
    const data = await r.json()
    setT2Log(prev => [...prev, r.ok ? `Released Pre-Season Packs: ${g}` : 'ERROR: ' + data.error])
    setT2Busy(false)
  }
  async function forceOpenT2(g: 'mens' | 'womens') {
    if (!confirm(`Force-open ALL remaining ${g} Pre-Season Packs? Users won't get the reveal.`)) return
    setT2Busy(true)
    const r = await fetch('/api/force-open-t2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: g }) })
    const data = await r.json()
    setT2Log(prev => [...prev, r.ok ? `Force-opened ${data.forced}/${data.pending} (${g}), failures: ${data.failures}` : 'ERROR: ' + data.error])
    setT2Busy(false)
  }
  const field = { background: '#181510', border: '1px solid #ffffff15', color: '#F5F1E8' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: "90px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8C15A' }}>GF Admin</p>
            <h1 className="text-3xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Season One Command</h1>
          </div>

          {/* ── Season command view ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ['Accounts', String(stats.users)],
              ['Teams M / W', `${stats.teams.mens} / ${stats.teams.womens}`],
              ['Rounds scored M / W', `${stats.roundsScored.mens} / ${stats.roundsScored.womens}`],
              ['Weekly unclaimed M / W', `${stats.weeklyUnclaimed.mens} / ${stats.weeklyUnclaimed.womens}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#2A211A', border: '1px solid #ffffff12' }}>
                <p className="text-2xl font-black" style={{ color: '#FFC425', fontFamily: 'var(--font-heading)' }}>{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-[#F5F1E8]/50">{label}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-12">
            <div className="rounded-xl p-4" style={{ background: '#2A211A', border: '1px solid #ffffff12' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#F5F1E8]/50">Cards dealt by source</p>
              <div className="flex gap-4 flex-wrap text-sm text-[#F5F1E8]">
                {stats.cardsBySource.length === 0 && <span className="text-[#F5F1E8]/40">None yet</span>}
                {stats.cardsBySource.map(c => (
                  <span key={c.source} className="font-bold uppercase">{c.source}: <b style={{ color: '#FFC425' }}>{c.count}</b></span>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#2A211A', border: '1px solid #ffffff12' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#F5F1E8]/50">Latest scored round</p>
              <div className="flex gap-5 flex-wrap text-sm text-[#F5F1E8]">
                {stats.latestRound.length === 0 && <span className="text-[#F5F1E8]/40">Nothing scored yet</span>}
                {stats.latestRound.map(r => (
                  <span key={r.grade} className="font-bold">
                    {r.grade === 'mens' ? 'M' : 'W'} R{r.round_number}: {r.teamsScored} teams{r.topScore != null ? `, top ${r.topScore}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Stats upload ── */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Round Stats Upload</h2>
          </div>

          <div className="flex gap-4 mb-4">
            <select value={grade} onChange={e => setGrade(e.target.value as 'mens' | 'womens')}
              className="rounded-lg px-4 py-3 text-sm flex-1" style={field}>
              <option value="mens">Men&apos;s</option>
              <option value="womens">Women&apos;s</option>
            </select>
            <input type="number" value={roundNumber} onChange={e => setRoundNumber(e.target.value)}
              placeholder="Round #" className="rounded-lg px-4 py-3 text-sm w-32" style={field} />
          </div>

          <textarea value={csv} onChange={e => setCsv(e.target.value)}
            placeholder={"Paste iScore CSV here. Expected header:\nplayer,singles,doubles,triples,hr,rbi,runs,bb,hbp,sb,cs,k_bat,ip,k_pit,win,er"}
            rows={12} className="w-full rounded-lg px-4 py-3 text-xs font-mono" style={field} />

          <div className="text-center mt-6">
            <button onClick={upload} disabled={busy || !csv.trim()}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ color: '#E8C15A', border: '1px solid #E8C15A', background: 'transparent', padding: "16px 56px" }}>
              {busy ? 'Processing…' : 'Upload & Score Round'}
            </button>
          </div>

          {log.length > 0 && (
            <pre className="mt-8 rounded-lg p-5 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: '#181510', border: '1px solid #ffffff10', color: '#3FBF63' }}>
              {log.join('\n')}
            </pre>
          )}

          {/* ── Score Round Only ── */}
          <div className="text-center mt-16 mb-8">
            <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Score Round Only</h2>
            <p className="text-xs text-[#F5F1E8]/40 mt-2">Re-run scoring on a round whose stats are already uploaded. Resolves H2H matchups too.</p>
          </div>

          <div className="flex gap-4 mb-4">
            <select value={scoreGrade} onChange={e => setScoreGrade(e.target.value as 'mens' | 'womens')}
              className="rounded-lg px-4 py-3 text-sm flex-1" style={field}>
              <option value="mens">Men&apos;s</option>
              <option value="womens">Women&apos;s</option>
            </select>
            <input type="number" value={scoreRound} onChange={e => setScoreRound(e.target.value)}
              placeholder="Round #" className="rounded-lg px-4 py-3 text-sm w-32" style={field} />
          </div>

          <div className="text-center mt-6">
            <button onClick={scoreOnly} disabled={scoreBusy}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ color: '#E8C15A', border: '1px solid #E8C15A', background: 'transparent', padding: "16px 56px" }}>
              {scoreBusy ? 'Scoring…' : 'Score Round'}
            </button>
          </div>

          {scoreLog.length > 0 && (
            <pre className="mt-8 rounded-lg p-5 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: '#181510', border: '1px solid #ffffff10', color: '#3FBF63' }}>
              {scoreLog.join('\n')}
            </pre>
          )}
          {/* ── Pre-Season Packs ── */}
          <div className="text-center mt-16 mb-8">
            <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Pre-Season Packs</h2>
            <p className="text-xs text-[#F5F1E8]/40 mt-2">Release lets users open their T2 with the full reveal. Force-open bulk-deals any still unopened — run it 12 hours before Round 1 lock.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => releaseT2('mens')} disabled={t2Busy}
              className="text-sm font-bold py-4 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#E8C15A', border: '1px solid #E8C15A' }}>Release Men&apos;s</button>
            <button onClick={() => releaseT2('womens')} disabled={t2Busy}
              className="text-sm font-bold py-4 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#4D7FFF', border: '1px solid #4D7FFF' }}>Release Women&apos;s</button>
            <button onClick={() => forceOpenT2('mens')} disabled={t2Busy}
              className="text-sm font-bold py-4 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#FF6B6B', border: '1px solid #FF6B6B' }}>Force-open Men&apos;s</button>
            <button onClick={() => forceOpenT2('womens')} disabled={t2Busy}
              className="text-sm font-bold py-4 transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ color: '#FF6B6B', border: '1px solid #FF6B6B' }}>Force-open Women&apos;s</button>
          </div>
          {t2Log.length > 0 && (
            <pre className="mt-6 rounded-lg p-5 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: '#181510', border: '1px solid #ffffff10', color: '#3FBF63' }}>
              {t2Log.join('\n')}
            </pre>
          )}
          {/* ── Availability ── */}
          <div className="text-center mt-16 mb-8">
            <h2 className="text-2xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Player Availability</h2>
            <p className="text-xs text-[#F5F1E8]/40 mt-2">Mark players unavailable for a round — users see it on their team cards immediately.</p>
          </div>

          <div className="flex gap-4 mb-4">
            <select value={availGrade} onChange={e => setAvailGrade(e.target.value as 'mens' | 'womens')}
              className="rounded-lg px-4 py-3 text-sm flex-1" style={field}>
              <option value="mens">Men&apos;s</option>
              <option value="womens">Women&apos;s</option>
            </select>
            <input type="number" value={availRound} onChange={e => setAvailRound(e.target.value)}
              placeholder="Round #" className="rounded-lg px-4 py-3 text-sm w-32" style={field} />
          </div>

          <textarea value={availNames} onChange={e => setAvailNames(e.target.value)}
            placeholder={"One player name per line:\nJack Besgrove\nHarrison Wildbore"}
            rows={5} className="w-full rounded-lg px-4 py-3 text-xs font-mono" style={field} />

          <div className="text-center mt-6">
            <button onClick={() => setAvailability(true)} disabled={availBusy || !availNames.trim()}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ color: '#FF6B6B', border: '1px solid #FF6B6B', background: 'transparent', padding: "16px 56px", marginRight: "16px" }}>
              {availBusy ? 'Working…' : 'Mark Unavailable'}
            </button>
            <button onClick={() => setAvailability(false)} disabled={availBusy || !availNames.trim()}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ color: '#3FBF63', border: '1px solid #3FBF63', background: 'transparent', padding: "16px 56px" }}>
              {availBusy ? 'Working…' : 'Mark Available'}
            </button>
          </div>

          {availLog.length > 0 && (
            <pre className="mt-8 rounded-lg p-5 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: '#181510', border: '1px solid #ffffff10', color: '#FF6B6B' }}>
              {availLog.join('\n')}
            </pre>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}