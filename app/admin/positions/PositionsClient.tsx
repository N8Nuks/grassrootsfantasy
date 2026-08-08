'use client'
import { useMemo, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { PositionPlayer } from './page'

const P = {
  purple: '#8B5CF6',
  orange: '#FF8C42',
  blue: '#7DD3FC',
  green: '#3FBF63',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}

const POS = ['P', 'PB', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF']
const POS_LABELS: Record<string, string> = { B1: '1B', B2: '2B', B3: '3B', PB: 'P(B)' }
const REVEALS = ['P', 'C', 'IF', 'OF']

export default function PositionsClient({ players }: { players: PositionPlayer[] }) {
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [filter, setFilter] = useState('')
  const [state, setState] = useState(() => new Map(players.map(p => [p.id, { positions: [...p.positions], revealPos: p.reveal_pos }])))
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const list = useMemo(() =>
    players.filter(p => p.grade === grade &&
      (!filter.trim() || p.full_name.toLowerCase().includes(filter.trim().toLowerCase()) || (p.clubs?.name ?? '').toLowerCase().includes(filter.trim().toLowerCase()))),
    [players, grade, filter])

  async function save(id: string, next: { positions: string[]; revealPos: string | null }) {
    setBusyId(id)
    setError('')
    const res = await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: id, positions: next.positions, revealPos: next.revealPos }),
    })
    setBusyId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? 'Save failed')
      return
    }
    setSavedIds(prev => new Set(prev).add(id))
    setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(id); return n }), 1500)
  }

  function togglePos(id: string, pos: string) {
    const cur = state.get(id)
    if (!cur) return
    const has = cur.positions.includes(pos)
    const next = { ...cur, positions: has ? cur.positions.filter(p => p !== pos) : [...cur.positions, pos] }
    setState(prev => new Map(prev).set(id, next))
    save(id, next)
  }

  function setReveal(id: string, val: string) {
    const cur = state.get(id)
    if (!cur) return
    const next = { ...cur, revealPos: val === '' ? null : val }
    setState(prev => new Map(prev).set(id, next))
    save(id, next)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: P.ink }}>
      <Nav />
      <section className="relative flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto' }}>

          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: P.orange, marginBottom: '14px' }}>GF Admin · Positions Master</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text, marginBottom: '10px' }}>Position Eligibility</h1>
            <p className="text-xs" style={{ color: P.dim, maxWidth: '480px', margin: '0 auto' }}>
              Lit chips are the slots this player can fill. Reveal sets what the orb shows (Auto = computed from positions). Every tap saves instantly.
            </p>
            <a href="/admin"
              className="inline-block text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.04]"
              style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '13px 30px', marginTop: '24px' }}>
              ← Command
            </a>
          </div>

          <div className="flex gap-4 flex-wrap" style={{ marginBottom: '24px' }}>
            <select value={grade} onChange={e => setGrade(e.target.value as 'mens' | 'womens')}
              className="rounded-xl px-4 py-3.5 text-sm w-40"
              style={{ background: P.panel, border: `1px solid ${P.purple}40`, color: P.text }}>
              <option value="mens">Men&apos;s</option>
              <option value="womens">Women&apos;s</option>
            </select>
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search name or club"
              className="rounded-xl px-4 py-3.5 text-sm flex-1"
              style={{ background: P.panel, border: `1px solid ${P.purple}40`, color: P.text }} />
          </div>

          {error && <p className="text-sm mb-4" style={{ color: '#FF6B6B' }}>ERROR: {error}</p>}

          <div className="flex flex-col gap-2">
            {list.map(p => {
              const cur = state.get(p.id) ?? { positions: [], revealPos: null }
              const saved = savedIds.has(p.id)
              return (
                <div key={p.id} className="rounded-xl" style={{ background: P.panel, border: `1px solid ${saved ? P.green : P.panelEdge}`, padding: '16px 20px', opacity: busyId === p.id ? 0.6 : 1 }}>
                  <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: '10px' }}>
                    <p className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text }}>{p.full_name}</p>
                    <span className="text-[10px]" style={{ color: P.dim }}>{p.clubs?.name ?? '—'}</span>
                    {saved && <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.green }}>✓ Saved</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {POS.map(pos => {
                      const on = cur.positions.includes(pos)
                      return (
                        <button key={pos} onClick={() => togglePos(p.id, pos)}
                          className="text-[11px] font-black rounded-lg transition-all hover:scale-105"
                          style={{
                            padding: '8px 12px',
                            color: on ? P.ink : P.dim,
                            background: on ? P.blue : 'transparent',
                            border: `1px solid ${on ? P.blue : '#ffffff20'}`,
                          }}>
                          {POS_LABELS[pos] ?? pos}
                        </button>
                      )
                    })}
                    <select value={cur.revealPos ?? ''} onChange={e => setReveal(p.id, e.target.value)}
                      className="text-[11px] font-black rounded-lg"
                      style={{ padding: '8px 10px', marginLeft: 'auto', background: cur.revealPos ? P.orange : P.ink, color: cur.revealPos ? P.ink : P.dim, border: `1px solid ${cur.revealPos ? P.orange : '#ffffff20'}` }}>
                      <option value="">Reveal: Auto</option>
                      {REVEALS.map(r => <option key={r} value={r}>Reveal: {r}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
            {list.length === 0 && <p className="text-sm text-center" style={{ color: P.dim, padding: '48px 0' }}>No players match.</p>}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}