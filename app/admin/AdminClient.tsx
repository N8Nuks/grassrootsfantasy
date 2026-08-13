'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { AdminStats } from './page'

// ── Command palette — matches the Photo Studio ──
const P = {
  purple: '#8B5CF6',
  orange: '#FF8C42',
  blue: '#7DD3FC',
  green: '#4ADE80',
  red: '#FF6B6B',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}

export default function AdminClient({ stats, cardStyle: initialStyle }: { stats: AdminStats; cardStyle: string }) {
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
    if (data.warnings?.length) {
      addLog(`Sanity check: ${data.warnings.length} warning(s)`)
      data.warnings.forEach((w: string) => addLog('  ⚠ ' + w))
    }
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

  const [styleLog, setStyleLog] = useState('')
  const [activeStyle, setActiveStyle] = useState(initialStyle)
  async function setCardStyle(style: 'standard' | 'premium') {
    const r = await fetch('/api/card-style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style }) })
    const data = await r.json()
    if (r.ok) setActiveStyle(data.style)
    setStyleLog(r.ok ? `Card style set to ${data.style}` : 'ERROR: ' + data.error)
  }

  const [rcLog, setRcLog] = useState<string[]>([])
  const [rcBusy, setRcBusy] = useState(false)

  async function roundControl(g: 'mens' | 'womens', action: 'open' | 'lock' | 'provisional' | 'status' | 'advance') {
    setRcBusy(true)
    const r = await fetch('/api/round-control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: g, action }) })
    const data = await r.json()
    if (!r.ok) setRcLog(prev => [...prev, 'ERROR: ' + data.error])
    else if (action === 'status') setRcLog(prev => [...prev, data.round ? `${g === 'mens' ? "Men's" : "Women's"} R${data.round.round_number}: ${data.round.status}` : `${g === 'mens' ? "Men's" : "Women's"}: no rounds yet`])
    else setRcLog(prev => [...prev, `${g === 'mens' ? "Men's" : "Women's"} R${data.round_number} → ${data.status}`])
    setRcBusy(false)
  }

  // Matchups — pairs every team for the latest round. Safe to re-run after a new intake.
  const [muLog, setMuLog] = useState<string[]>([])
  const [muBusy, setMuBusy] = useState(false)

  async function generateMatchups(g: 'mens' | 'womens') {
    const label = g === 'mens' ? "Men's" : "Women's"
    if (!confirm(`Generate ${label} matchups for the latest round? Any existing pairings for that round are replaced.`)) return
    setMuBusy(true)
    const r = await fetch('/api/generate-matchups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade: g }) })
    const data = await r.json()
    if (!r.ok) { setMuLog(prev => [...prev, 'ERROR: ' + data.error]); setMuBusy(false); return }
    setMuLog(prev => [...prev, `${label} R${data.round_number}: ${data.teams} teams → ${data.matchups} matchups`])
    if (data.unpaired) setMuLog(prev => [...prev, `  ⚠ No opponent for "${data.unpaired}" — add a filler team and run again`])
    setMuBusy(false)
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

  const field = { background: P.ink, border: `1px solid ${P.purple}40`, color: P.text }

  function Panel({ number, title, accent, sub, children }: {
    number: string; title: string; accent: string; sub?: string; children: React.ReactNode
  }) {
    return (
      <div className="rounded-2xl" style={{
        background: P.panel, border: `1px solid ${P.panelEdge}`,
        padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${accent}0E`,
      }}>
        <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: accent, marginBottom: sub ? '6px' : '18px' }}>
          {number} · {title}
        </p>
        {sub && <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>{sub}</p>}
        {children}
      </div>
    )
  }

  function LogBox({ lines, error }: { lines: string[]; error?: boolean }) {
    if (!lines.length) return null
    return (
      <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{
        marginTop: '20px', padding: '20px 24px',
        background: P.ink,
        border: `1px solid ${error ? P.red + '50' : P.blue + '30'}`,
        color: error ? P.red : P.green,
      }}>
        {lines.join('\n')}
      </pre>
    )
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: P.ink }}>
      {/* Dynamic studio backdrop */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 50% at 15% 10%, ${P.purple}28 0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 85% 25%, ${P.blue}20 0%, transparent 60%),
          radial-gradient(ellipse 75% 55% at 50% 100%, ${P.orange}18 0%, transparent 55%)
        `,
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(${P.purple}0A 1px, transparent 1px), linear-gradient(90deg, ${P.purple}0A 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 0%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 30%, black 0%, transparent 100%)',
      }} />

      <Nav />
      <section className="relative flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>

          {/* Header */}
          <div className="text-center" style={{ marginBottom: '48px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: P.orange, marginBottom: '14px' }}>GF Admin</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text, marginBottom: '26px' }}>Season One Command</h1>
            <a href="/admin/photos"
              className="inline-block text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.04]"
              style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '13px 30px' }}>
              Photo Studio →
            </a>
          </div>

          {/* Season pulse */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: '16px' }}>
            {[
              ['Accounts', String(stats.users)],
              ['Teams M / W', `${stats.teams.mens} / ${stats.teams.womens}`],
              ['Rounds scored M / W', `${stats.roundsScored.mens} / ${stats.roundsScored.womens}`],
              ['Weekly unclaimed M / W', `${stats.weeklyUnclaimed.mens} / ${stats.weeklyUnclaimed.womens}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl text-center" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '18px 12px' }}>
                <p className="text-2xl font-black" style={{ color: P.orange, fontFamily: 'var(--font-heading)' }}>{value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.dim, marginTop: '6px' }}>{label}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3" style={{ marginBottom: '48px' }}>
            <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '18px 20px' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.dim, marginBottom: '12px' }}>Cards dealt by source</p>
              <div className="flex gap-4 flex-wrap text-sm" style={{ color: P.text }}>
                {stats.cardsBySource.length === 0 && <span style={{ color: P.dim }}>None yet</span>}
                {stats.cardsBySource.map(c => (
                  <span key={c.source} className="font-bold uppercase">{c.source}: <b style={{ color: P.orange }}>{c.count}</b></span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '18px 20px' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.dim, marginBottom: '12px' }}>Latest scored round</p>
              <div className="flex gap-5 flex-wrap text-sm" style={{ color: P.text }}>
                {stats.latestRound.length === 0 && <span style={{ color: P.dim }}>Nothing scored yet</span>}
                {stats.latestRound.map(r => (
                  <span key={r.grade} className="font-bold">
                    {r.grade === 'mens' ? 'M' : 'W'} R{r.round_number}: {r.teamsScored} teams{r.topScore != null ? `, top ${r.topScore}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 1 · Stats upload */}
          <Panel number="1" title="Round Stats Upload" accent={P.purple}>
            <div className="flex gap-4" style={{ marginBottom: '16px' }}>
              <select value={grade} onChange={e => setGrade(e.target.value as 'mens' | 'womens')}
                className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
                <option value="mens">Men&apos;s</option>
                <option value="womens">Women&apos;s</option>
              </select>
              <input type="number" value={roundNumber} onChange={e => setRoundNumber(e.target.value)}
                placeholder="Round #" className="rounded-xl px-4 py-3.5 text-sm w-32" style={field} />
            </div>
            <textarea value={csv} onChange={e => setCsv(e.target.value)}
              placeholder={"Paste iScore CSV here. Expected header:\nplayer,ab,singles,doubles,triples,hr,rbi,runs,bb,hbp,sb,cs,k_bat,ip,k_pit,win,er"}
              rows={12} className="w-full rounded-xl px-4 py-3.5 text-xs font-mono" style={field} />
            <div className="text-center" style={{ marginTop: '22px' }}>
              <button onClick={upload} disabled={busy || !csv.trim()}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{
                  color: P.ink,
                  background: `linear-gradient(120deg, ${P.purple} 0%, ${P.orange} 100%)`,
                  padding: '16px 52px',
                  boxShadow: `0 0 30px ${P.purple}50`,
                }}>
                {busy ? 'Processing…' : 'Upload & Score Round'}
              </button>
            </div>
            <LogBox lines={log} />
          </Panel>

          {/* 2 · Score only */}
          <Panel number="2" title="Score Round Only" accent={P.blue}
            sub="Re-run scoring on a round whose stats are already uploaded. Resolves H2H matchups too.">
            <div className="flex gap-4" style={{ marginBottom: '16px' }}>
              <select value={scoreGrade} onChange={e => setScoreGrade(e.target.value as 'mens' | 'womens')}
                className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
                <option value="mens">Men&apos;s</option>
                <option value="womens">Women&apos;s</option>
              </select>
              <input type="number" value={scoreRound} onChange={e => setScoreRound(e.target.value)}
                placeholder="Round #" className="rounded-xl px-4 py-3.5 text-sm w-32" style={field} />
            </div>
            <div className="text-center">
              <button onClick={scoreOnly} disabled={scoreBusy}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.blue, border: `1px solid ${P.blue}`, background: 'transparent', padding: '16px 52px' }}>
                {scoreBusy ? 'Scoring…' : 'Score Round'}
              </button>
            </div>
            <LogBox lines={scoreLog} error={scoreLog[0]?.startsWith('ERROR')} />
          </Panel>

          {/* Round Control */}
          <Panel number="3" title="Round Control" accent={P.red}
            sub="Open lets users save lineups for the latest round; Lock rejects saves. Check shows the current status.">
            {/* The weekly ritual */}
            <div className="rounded-xl" style={{ background: P.ink, border: `1px solid ${P.purple}30`, padding: '16px 20px', marginBottom: '20px' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.dim, marginBottom: '12px' }}>The weekly ritual</p>
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
                <span className="rounded-full px-3 py-1.5" style={{ color: P.green, border: `1px solid ${P.green}60` }}>Tue · Open</span>
                <span style={{ color: P.dim }}>→</span>
                <span className="rounded-full px-3 py-1.5" style={{ color: P.red, border: `1px solid ${P.red}60` }}>Fri 4pm · Lock</span>
                <span style={{ color: P.dim }}>→</span>
                <span className="rounded-full px-3 py-1.5" style={{ color: P.purple, border: `1px solid ${P.purple}60` }}>Sat · Upload &amp; Score</span>
                <span style={{ color: P.dim }}>→</span>
                <span className="rounded-full px-3 py-1.5" style={{ color: P.orange, border: `1px solid ${P.orange}60` }}>Scores go live</span>
                <span style={{ color: P.dim }}>→</span>
                <span className="rounded-full px-3 py-1.5" style={{ color: P.blue, border: `1px solid ${P.blue}60` }}>Tue · Next Round</span>
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.green, marginBottom: '10px' }}>Men&apos;s</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" style={{ marginBottom: '20px' }}>
              <button onClick={() => roundControl('mens', 'status')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.dim, border: `1px solid ${P.purple}40`, padding: '16px 0' }}>Check Men&apos;s</button>
              <button onClick={() => roundControl('mens', 'open')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.green, border: `1px solid ${P.green}70`, padding: '16px 0' }}>Open Men&apos;s</button>
              <button onClick={() => roundControl('mens', 'lock')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.red, border: `1px solid ${P.red}70`, padding: '16px 0' }}>Lock Men&apos;s</button>
              <button onClick={() => roundControl('mens', 'provisional')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.orange, border: `1px solid ${P.orange}70`, padding: '16px 0' }}>Scores Live M</button>
              <button onClick={() => { if (confirm('Start the next Men\'s round? This opens a new week and a fresh Weekly Pack for everyone.')) roundControl('mens', 'advance') }} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.purple, border: `1px solid ${P.purple}70`, padding: '16px 0' }}>Next Round M</button>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue, marginBottom: '10px' }}>Women&apos;s</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button onClick={() => roundControl('womens', 'status')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.dim, border: `1px solid ${P.purple}40`, padding: '16px 0' }}>Check Women&apos;s</button>
              <button onClick={() => roundControl('womens', 'open')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '16px 0' }}>Open Women&apos;s</button>
              <button onClick={() => roundControl('womens', 'lock')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.red, border: `1px solid ${P.red}70`, padding: '16px 0' }}>Lock Women&apos;s</button>
              <button onClick={() => roundControl('womens', 'provisional')} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.orange, border: `1px solid ${P.orange}70`, padding: '16px 0' }}>Scores Live W</button>
              <button onClick={() => { if (confirm('Start the next Women\'s round? This opens a new week and a fresh Weekly Pack for everyone.')) roundControl('womens', 'advance') }} disabled={rcBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.purple, border: `1px solid ${P.purple}70`, padding: '16px 0' }}>Next Round W</button>
            </div>
            <LogBox lines={rcLog} error={rcLog[rcLog.length - 1]?.startsWith('ERROR')} />
          </Panel>

          {/* 4 · Matchups */}
          <Panel number="4" title="Generate Matchups" accent={P.blue}
            sub="Pairs every team for the LATEST round. Run after Next Round, and again after a new intake of users — existing pairings for that round are replaced, never duplicated. An odd number of teams leaves one unpaired: add a filler team and run again.">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => generateMatchups('mens')} disabled={muBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.green, border: `1px solid ${P.green}70`, padding: '16px 0' }}>
                {muBusy ? 'Working…' : "Pair Men's"}
              </button>
              <button onClick={() => generateMatchups('womens')} disabled={muBusy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '16px 0' }}>
                {muBusy ? 'Working…' : "Pair Women's"}
              </button>
            </div>
            <LogBox lines={muLog} error={muLog[muLog.length - 1]?.startsWith('ERROR')} />
          </Panel>

          {/* 5 · Pre-Season Packs */}
          <Panel number="5" title="Pre-Season Packs" accent={P.orange}
            sub="Release lets users open their T2 with the full reveal. Force-open bulk-deals any still unopened — run it 12 hours before Round 1 lock.">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => releaseT2('mens')} disabled={t2Busy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.green, border: `1px solid ${P.green}70`, padding: '16px 0' }}>Release Men&apos;s</button>
              <button onClick={() => releaseT2('womens')} disabled={t2Busy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '16px 0' }}>Release Women&apos;s</button>
              <button onClick={() => forceOpenT2('mens')} disabled={t2Busy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.red, border: `1px solid ${P.red}70`, padding: '16px 0' }}>Force-open Men&apos;s</button>
              <button onClick={() => forceOpenT2('womens')} disabled={t2Busy}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01] disabled:opacity-40"
                style={{ color: P.red, border: `1px solid ${P.red}70`, padding: '16px 0' }}>Force-open Women&apos;s</button>
            </div>
            <LogBox lines={t2Log} />
          </Panel>

          {/* 6 · Availability */}
          <Panel number="6" title="Player Availability" accent={P.green}
            sub="Mark players unavailable for a round — users see it on their team cards immediately.">
            <div className="flex gap-4" style={{ marginBottom: '16px' }}>
              <select value={availGrade} onChange={e => setAvailGrade(e.target.value as 'mens' | 'womens')}
                className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
                <option value="mens">Men&apos;s</option>
                <option value="womens">Women&apos;s</option>
              </select>
              <input type="number" value={availRound} onChange={e => setAvailRound(e.target.value)}
                placeholder="Round #" className="rounded-xl px-4 py-3.5 text-sm w-32" style={field} />
            </div>
            <textarea value={availNames} onChange={e => setAvailNames(e.target.value)}
              placeholder={"One player name per line:\nJack Besgrove\nHarrison Wildbore"}
              rows={5} className="w-full rounded-xl px-4 py-3.5 text-xs font-mono" style={field} />
            <div className="text-center flex justify-center gap-4 flex-wrap" style={{ marginTop: '22px' }}>
              <button onClick={() => setAvailability(true)} disabled={availBusy || !availNames.trim()}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.red, border: `1px solid ${P.red}`, background: 'transparent', padding: '16px 44px' }}>
                {availBusy ? 'Working…' : 'Mark Unavailable'}
              </button>
              <button onClick={() => setAvailability(false)} disabled={availBusy || !availNames.trim()}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.green, border: `1px solid ${P.green}`, background: 'transparent', padding: '16px 44px' }}>
                {availBusy ? 'Working…' : 'Mark Available'}
              </button>
            </div>
            <LogBox lines={availLog} error={availLog[0]?.startsWith('ERROR')} />
          </Panel>

          {/* 7 · Card Style */}
          <Panel number="7" title="Card Style" accent={P.purple}
            sub="Premium shows the full designed cards (backdrops, marks). Standard is the clean build for testing and trial weeks.">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setCardStyle('standard')}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  color: activeStyle === 'standard' ? P.ink : P.blue,
                  background: activeStyle === 'standard' ? P.blue : 'transparent',
                  border: `1px solid ${P.blue}70`,
                  opacity: activeStyle === 'standard' ? 1 : 0.55,
                  padding: '16px 0',
                }}>Standard{activeStyle === 'standard' ? ' ✓' : ''}</button>
              <button type="button" onClick={() => setCardStyle('premium')}
                className="text-sm font-black uppercase tracking-widest rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  color: activeStyle === 'premium' ? P.ink : P.orange,
                  background: activeStyle === 'premium' ? P.orange : 'transparent',
                  border: `1px solid ${P.orange}70`,
                  opacity: activeStyle === 'premium' ? 1 : 0.55,
                }}>Premium{activeStyle === 'premium' ? ' ✓' : ''}</button>
            </div>
            {styleLog && <LogBox lines={[styleLog]} error={styleLog.startsWith('ERROR')} />}
          </Panel>
        </div>
      </section>
      <Footer />
    </main>
  )
}