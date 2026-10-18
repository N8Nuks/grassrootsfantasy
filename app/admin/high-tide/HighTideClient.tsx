'use client'
import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { Listing } from './page'

const CATEGORIES = ['Trades', 'Food & hospo', 'Professional services', 'Health & fitness', 'Retail', 'Digital services', 'Sports technology', 'Media', 'Other'] as const

const P = {
  purple: '#8B5CF6',
  orange: '#FF8C42',
  blue: '#7DD3FC',
  green: '#3FBF63',
  red: '#FF6B6B',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}

const field = { background: P.ink, border: `1px solid ${P.purple}40`, color: P.text }

type Status = Listing['status']
type Tab = Status | 'all'
const TABS: { key: Tab; label: string; accent: string }[] = [
  { key: 'pending', label: 'Pending', accent: P.orange },
  { key: 'needs_info', label: 'Needs info', accent: P.blue },
  { key: 'approved', label: 'Approved', accent: P.green },
  { key: 'rejected', label: 'Rejected', accent: P.red },
  { key: 'all', label: 'All', accent: P.dim },
]

const STATUS_COLOUR: Record<Status, string> = { pending: P.orange, needs_info: P.blue, approved: P.green, rejected: P.red }

const EMPTY_FORM = {
  first_name: '', last_name: '', player_name: '',
  business_name: '', blurb: '', category: CATEGORIES[0] as string, area: '',
  phone: '', email: '', website: '', socials: '', logo_url: '', approve: true,
}

export default function HighTideClient({ counts: initialCounts }: { counts: Record<string, number> }) {
  const [tab, setTab] = useState<Tab>('pending')
  const [counts, setCounts] = useState(initialCounts)
  const [rows, setRows] = useState<Listing[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    setRows(null)
    fetch(`/api/high-tide-admin?status=${tab}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (!cancelled) setRows(ok ? d.listings : []) ; if (!ok && !cancelled) setLog(['ERROR: ' + d.error]) })
      .catch(() => { if (!cancelled) { setRows([]); setLog(['ERROR: could not load listings']) } })
    return () => { cancelled = true }
  }, [tab, refresh])

  async function act(l: Listing, action: 'approve' | 'needs_info' | 'reject' | 'deactivate' | 'reactivate') {
    let admin_note: string | undefined
    if (action === 'needs_info') {
      const n = prompt(`What does ${l.business_name} need to add or fix?`, l.admin_note ?? '')
      if (n === null) return
      admin_note = n
    }
    if (action === 'reject') {
      const n = prompt(`Reject ${l.business_name}? Note (optional):`, '')
      if (n === null) return
      admin_note = n
    }
    setBusyId(l.id)
    const r = await fetch('/api/high-tide-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id: l.id, admin_note }),
    })
    const d = await r.json()
    setBusyId(null)
    if (!r.ok) { setLog(prev => [...prev, 'ERROR: ' + d.error]); return }
    setLog(prev => [...prev, `${d.listing.business_name} → ${d.listing.status}${d.listing.active ? '' : ' (inactive)'}`])
    if (d.listing.status !== l.status) {
      setCounts(c => ({ ...c, [l.status]: Math.max(0, (c[l.status] ?? 0) - 1), [d.listing.status]: (c[d.listing.status] ?? 0) + 1 }))
    }
    setRefresh(n => n + 1)
  }

  // Admin-loaded listing
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formBusy, setFormBusy] = useState(false)
  const [formLog, setFormLog] = useState<string[]>([])
  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) { setForm(f => ({ ...f, [k]: v })) }

  async function create() {
    setFormBusy(true); setFormLog([])
    const r = await fetch('/api/high-tide-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', listing: form }),
    })
    const d = await r.json()
    setFormBusy(false)
    if (!r.ok) { setFormLog(['ERROR: ' + d.error]); return }
    const lines = [`Listed ${form.business_name} (${form.first_name} ${form.last_name}) as ${form.approve ? 'approved' : 'pending'}`]
    if (d.note) lines.push('  ⚠ ' + d.note)
    setFormLog(lines)
    setCounts(c => { const s = form.approve ? 'approved' : 'pending'; return { ...c, [s]: (c[s] ?? 0) + 1 } })
    setForm({ ...EMPTY_FORM })
    setRefresh(n => n + 1)
  }

  const canCreate = form.first_name.trim() && form.last_name.trim() && form.business_name.trim() && form.blurb.trim()
    && (form.phone.trim() || form.email.trim() || form.website.trim())

  return (
    <main className="min-h-screen flex flex-col" style={{ background: P.ink }}>
      <Nav />
      <section className="relative flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto' }}>

          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: P.orange, marginBottom: '14px' }}>GF Admin · High Tide</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text, marginBottom: '10px' }}>Community Directory</h1>
            <p className="text-xs" style={{ color: P.dim, maxWidth: '480px', margin: '0 auto' }}>
              Nothing shows on /high-tide until it is approved here. Needs info sends a note back to the owner; they edit and it returns to Pending. No under-18s.
            </p>
            <a href="/admin"
              className="inline-block text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.04]"
              style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '13px 30px', marginTop: '24px' }}>
              ← Command
            </a>
          </div>

          {/* Status tabs */}
          <div className="grid grid-cols-5 gap-2" style={{ marginBottom: '24px' }}>
            {TABS.map(t => {
              const on = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="rounded-xl text-center transition-all hover:scale-[1.02]"
                  style={{ background: on ? t.accent : P.panel, border: `1px solid ${on ? t.accent : P.panelEdge}`, padding: '14px 6px' }}>
                  <p className="text-xl font-black" style={{ color: on ? P.ink : t.accent, fontFamily: 'var(--font-heading)' }}>
                    {t.key === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[t.key] ?? 0}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: on ? P.ink : P.dim, marginTop: '4px' }}>{t.label}</p>
                </button>
              )
            })}
          </div>

          {/* Listings */}
          <div className="flex flex-col gap-2" style={{ marginBottom: '40px' }}>
            {rows === null && <p className="text-sm text-center" style={{ color: P.dim, padding: '48px 0' }}>Loading…</p>}
            {rows?.length === 0 && <p className="text-sm text-center" style={{ color: P.dim, padding: '48px 0' }}>Nothing here.</p>}
            {rows?.map(l => (
              <div key={l.id} className="rounded-xl" style={{ background: P.panel, border: `1px solid ${STATUS_COLOUR[l.status]}40`, padding: '16px 20px', opacity: busyId === l.id ? 0.6 : 1 }}>
                <div className="flex items-start gap-3 flex-wrap" style={{ marginBottom: '8px' }}>
                  {l.logo_url && <img src={l.logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, background: P.ink }} />}
                  <div className="flex-1" style={{ minWidth: '200px' }}>
                    <p className="text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text }}>
                      {l.business_name}
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: STATUS_COLOUR[l.status], marginLeft: '10px' }}>{l.status.replace('_', ' ')}{!l.active ? ' · inactive' : ''}</span>
                    </p>
                    <p className="text-[11px]" style={{ color: P.dim }}>
                      {l.first_name} {l.last_name}{l.player_name ? ` (GF: ${l.player_name})` : ''} · {l.category}{l.area ? ` · ${l.area}` : ''}
                    </p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: P.text, marginBottom: '8px' }}>{l.blurb}</p>
                <p className="text-[11px]" style={{ color: P.dim, marginBottom: '10px' }}>
                  {[l.phone, l.email, l.website, l.socials].filter(Boolean).join(' · ') || 'no contact'}
                </p>
                {l.admin_note && <p className="text-[11px]" style={{ color: P.blue, marginBottom: '10px' }}>Note: {l.admin_note}</p>}
                <div className="flex gap-2 flex-wrap">
                  {l.status !== 'approved' && (
                    <button onClick={() => act(l, 'approve')} disabled={busyId === l.id}
                      className="text-[10px] font-black uppercase tracking-widest rounded-full disabled:opacity-40"
                      style={{ color: P.green, border: `1px solid ${P.green}70`, padding: '8px 16px' }}>Approve</button>
                  )}
                  {l.status !== 'needs_info' && l.status !== 'approved' && (
                    <button onClick={() => act(l, 'needs_info')} disabled={busyId === l.id}
                      className="text-[10px] font-black uppercase tracking-widest rounded-full disabled:opacity-40"
                      style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '8px 16px' }}>Needs info</button>
                  )}
                  {l.status !== 'rejected' && (
                    <button onClick={() => act(l, 'reject')} disabled={busyId === l.id}
                      className="text-[10px] font-black uppercase tracking-widest rounded-full disabled:opacity-40"
                      style={{ color: P.red, border: `1px solid ${P.red}70`, padding: '8px 16px' }}>Reject</button>
                  )}
                  {l.status === 'approved' && (
                    <button onClick={() => act(l, l.active ? 'deactivate' : 'reactivate')} disabled={busyId === l.id}
                      className="text-[10px] font-black uppercase tracking-widest rounded-full disabled:opacity-40"
                      style={{ color: l.active ? P.orange : P.green, border: `1px solid ${(l.active ? P.orange : P.green)}70`, padding: '8px 16px' }}>
                      {l.active ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {log.length > 0 && (
            <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{ marginBottom: '40px', padding: '16px 20px', background: P.ink, border: `1px solid ${P.blue}30`, color: P.green }}>
              {log.join('\n')}
            </pre>
          )}

          {/* Admin-loaded listing */}
          <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '28px' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.purple, marginBottom: '6px' }}>Add a listing</p>
            <p className="text-xs" style={{ color: P.dim, marginBottom: '18px' }}>Real first and last name are required. GF name is optional and links the listing to their player card if it matches.</p>
            <div className="grid sm:grid-cols-3 gap-3" style={{ marginBottom: '12px' }}>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name *" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name *" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.player_name} onChange={e => set('player_name', e.target.value)} placeholder="GF name (optional)" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3" style={{ marginBottom: '12px' }}>
              <input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Business name *" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <select value={form.category} onChange={e => set('category', e.target.value)} className="rounded-xl px-4 py-3.5 text-sm" style={field}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.area} onChange={e => set('area', e.target.value)} placeholder="Area served (e.g. West Auckland)" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="Website" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.socials} onChange={e => set('socials', e.target.value)} placeholder="Instagram / Facebook" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
              <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="Logo URL (optional)" className="rounded-xl px-4 py-3.5 text-sm" style={field} />
            </div>
            <textarea value={form.blurb} onChange={e => set('blurb', e.target.value.slice(0, 160))} placeholder="What they do — one line, 160 characters max *" rows={2} className="w-full rounded-xl px-4 py-3.5 text-sm" style={field} />
            <p className="text-[10px] text-right" style={{ color: P.dim, marginTop: '4px' }}>{form.blurb.length}/160 · at least one of phone, email or website</p>
            <label className="flex items-center gap-2 text-xs" style={{ color: P.text, marginTop: '14px' }}>
              <input type="checkbox" checked={form.approve} onChange={e => set('approve', e.target.checked)} />
              Approve straight away
            </label>
            <div className="text-center" style={{ marginTop: '22px' }}>
              <button onClick={create} disabled={formBusy || !canCreate}
                className="text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.ink, background: `linear-gradient(120deg, ${P.purple} 0%, ${P.orange} 100%)`, padding: '16px 52px', boxShadow: `0 0 30px ${P.purple}50` }}>
                {formBusy ? 'Saving…' : 'Add Listing'}
              </button>
            </div>
            {formLog.length > 0 && (
              <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{ marginTop: '20px', padding: '16px 20px', background: P.ink, border: `1px solid ${formLog[0].startsWith('ERROR') ? P.red + '50' : P.blue + '30'}`, color: formLog[0].startsWith('ERROR') ? P.red : P.green }}>
                {formLog.join('\n')}
              </pre>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}