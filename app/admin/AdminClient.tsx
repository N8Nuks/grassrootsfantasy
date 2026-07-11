'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function AdminClient() {
  const [csv, setCsv] = useState('')
  const [roundNumber, setRoundNumber] = useState('0')
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

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
    addLog(`Scored: ${sdata.players_scored} players, ${sdata.teams_scored} teams. Done.`)
    setBusy(false)
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

  const field = { background: '#181510', border: '1px solid #ffffff15', color: '#F5F1E8' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: "130px", paddingBottom: "100px" }}>
        <div style={{ maxWidth: "720px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8C15A' }}>GF Admin</p>
            <h1 className="text-3xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Round Stats Upload</h1>
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