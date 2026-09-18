'use client'
import { useMemo, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { PhotoPlayer } from './page'

// ── Studio palette ──
const P = {
  purple: '#8B5CF6',
  orange: '#FF8C42',
  blue: '#7DD3FC',
  ink: '#12101C',
  panel: '#1C1830',
  panelEdge: '#8B5CF630',
  text: '#F2EFFB',
  dim: '#F2EFFB80',
}

// Crop a transparent-background PNG down to its visible pixels
async function trimTransparent(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let top = height, bottom = 0, left = width, right = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 8) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (top >= bottom || left >= right) return blob

  const w = right - left + 1
  const h = bottom - top + 1
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(canvas, left, top, w, h, 0, 0, w, h)
  return new Promise(resolve => out.toBlob(b => resolve(b!), 'image/png'))
}

/* Shrink an oversized photo before any cut-out work. The AI model runs in the
   browser and its cost scales with pixels, so a 6000px camera file can take
   minutes; the card never shows more than ~700px. */
async function downscale(file: Blob, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const longest = Math.max(bitmap.width, bitmap.height)
  if (longest <= maxEdge) return file
  const scale = maxEdge / longest
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

/* Black-background keying: for a cut-out that was saved onto black rather than
   onto transparency. Floods in from the frame edges, so only background-connected
   black is removed — a black helmet, glove or shadow inside the subject survives. */
async function lumaKeyDark(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  const W = canvas.width, H = canvas.height
  const isDark = (i: number) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) < 40

  const seen = new Uint8Array(W * H)
  const stack: number[] = []
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x) }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1) }
  while (stack.length) {
    const p = stack.pop()!
    if (seen[p]) continue
    if (!isDark(p * 4)) continue
    seen[p] = 1
    const x = p % W, y = (p / W) | 0
    if (x > 0) stack.push(p - 1)
    if (x < W - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - W)
    if (y < H - 1) stack.push(p + W)
  }
  for (let p = 0; p < W * H; p++) if (seen[p]) d[p * 4 + 3] = 0
  ctx.putImageData(img, 0, 0)
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

// Green-screen keying: near-green pixels go transparent, soft edges at the boundary
async function chromaKeyGreen(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const dominance = g - Math.max(r, b)
    if (dominance > 60) d[i + 3] = 0
    else if (dominance > 30) d[i + 3] = Math.round(d[i + 3] * (1 - (dominance - 30) / 30))
  }
  ctx.putImageData(img, 0, 0)
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
}

const MODES = [
  ['ai', 'AI cut-out'],
  ['none', 'Already cut out'],
  ['dark', 'On black'],
  ['green', 'Green screen'],
] as const
type Mode = typeof MODES[number][0]

export default function PhotosClient({ players }: { players: PhotoPlayer[] }) {
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [playerId, setPlayerId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [cutout, setCutout] = useState<Blob | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<Mode>('ai')
  const [playingNumber, setPlayingNumber] = useState('')
  const [revealPos, setRevealPos] = useState('')
  const [under18, setUnder18] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ matched: { name: string; number: number; had: number | null }[]; unmatched: string[]; wrote: number } | null>(null)

  async function runBulk(confirm: boolean) {
    setBulkBusy(true)
    const res = await fetch('/api/bulk-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: bulkText, grade, confirm }),
    })
    const data = await res.json()
    setBulkBusy(false)
    if (!res.ok) { setBulkResult(null); setStatus('ERROR: ' + data.error); return }
    setBulkResult(data)
    setStatus(confirm ? `✓ Wrote ${data.wrote} numbers` : `Preview: ${data.matched.length} matched, ${data.unmatched.length} unmatched`)
  }

  const gradePlayers = useMemo(
    () => players.filter(p => p.grade === grade),
    [players, grade]
  )
  const selected = players.find(p => p.id === playerId)
  const done = players.filter(p => p.photo_url).length

  const field = {
    background: P.ink,
    border: `1px solid ${P.purple}40`,
    color: P.text,
  }

  function selectPlayer(id: string) {
    setPlayerId(id)
    setPreview(null)
    setCutout(null)
    setStatus('')
    const p = players.find(x => x.id === id)
    setPlayingNumber(p?.playing_number != null ? String(p.playing_number) : '')
    setRevealPos(p?.reveal_pos ?? '')
    setUnder18(p?.is_under18 ?? false)
  }

  async function handleFile(file: File) {
    setBusy(true)
    setCutout(null)
    setPreview(null)
    try {
      setStatus('Preparing the photo…')
      const source = await downscale(file)
      let removed: Blob
      if (mode === 'green') {
        setStatus('Keying out green…')
        removed = await chromaKeyGreen(source)
      } else if (mode === 'dark') {
        setStatus('Removing the black background…')
        removed = await lumaKeyDark(source)
      } else if (mode === 'none') {
        setStatus('Using the supplied cut-out as is…')
        removed = source
      } else {
        setStatus('Cutting out background… (first run downloads the tool, can take a minute)')
        const { removeBackground } = await import('@imgly/background-removal')
        removed = await removeBackground(source)
      }
      setStatus('Trimming to fit…')
      const trimmed = await trimTransparent(removed)
      setCutout(trimmed)
      setPreview(URL.createObjectURL(trimmed))
      setStatus('Cut-out ready. Check it, then save.')
    } catch (e) {
      setStatus('ERROR cutting out: ' + (e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  async function save() {
    if (!playerId) return
    setBusy(true)
    setStatus('Saving…')
    const form = new FormData()
    if (cutout) form.append('file', new File([cutout], 'photo.png', { type: 'image/png' }))
    form.append('player_id', playerId)
    form.append('playing_number', playingNumber.trim())
    form.append('reveal_pos', revealPos)
    form.append('is_under18', under18 ? 'true' : 'false')
    const res = await fetch('/api/upload-photo', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setStatus('ERROR: ' + data.error); setBusy(false); return }
    setStatus(`✓ Saved for ${data.name}${data.photo ? ' (photo updated)' : ''}`)
    setBusy(false)
  }

  const statusPanel = status ? (
    <pre className="rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{
      marginTop: '30px', padding: '20px 24px',
      background: P.ink, border: `1px solid ${status.startsWith('ERROR') ? '#FF6B6B50' : P.blue + '30'}`,
      color: status.startsWith('ERROR') ? '#FF6B6B' : P.blue,
    }}>
      {status}
    </pre>
  ) : null

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
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: P.orange, marginBottom: '14px' }}>GF Admin · Photo Studio</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'var(--font-heading)', color: P.text, marginBottom: '10px' }}>Player Photos</h1>
            <p className="text-xs" style={{ color: P.dim, maxWidth: '440px', margin: '0 auto' }}>
              Pick a player, set their number and age status, add a photo if you have one. Re-uploading replaces the old photo.
            </p>
            <div className="flex items-center justify-center gap-4" style={{ marginTop: '26px' }}>
              <a href="/admin"
                className="inline-block text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.04]"
                style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '13px 30px' }}>
                ← Command
              </a>
              <span className="text-xs font-black uppercase tracking-widest rounded-full"
                style={{ color: P.orange, background: `${P.orange}18`, border: `1px solid ${P.orange}50`, padding: '13px 30px' }}>
                {done} / {players.length} photos in
              </span>
            </div>
          </div>

          {/* Selection panel */}
          <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.purple}12` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.purple, marginBottom: '16px' }}>1 · Choose the player</p>
            <div className="flex gap-4">
              <select value={grade} onChange={e => { setGrade(e.target.value as 'mens' | 'womens'); selectPlayer('') }}
                className="rounded-xl px-4 py-3.5 text-sm w-40" style={field}>
                <option value="mens">Men&apos;s</option>
                <option value="womens">Women&apos;s</option>
              </select>
              <select value={playerId} onChange={e => selectPlayer(e.target.value)}
                className="rounded-xl px-4 py-3.5 text-sm flex-1" style={field}>
                <option value="">— Select player —</option>
                {gradePlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.clubs?.name ?? '—'}){p.photo_url ? ' ✓' : ''}{p.is_under18 ? ' · U18' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selected && (
              <p className="text-xs" style={{ color: P.dim, marginTop: '14px' }}>
                {selected.photo_url ? 'This player already has a photo — uploading will replace it.' : 'No photo yet.'}
              </p>
            )}
          </div>

          {selected && (
            <>
              {/* Details panel */}
              <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.blue}0E` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.blue, marginBottom: '16px' }}>2 · Number &amp; age status</p>
                <div className="flex gap-6 items-center flex-wrap">
                  <input type="number" value={playingNumber} onChange={e => setPlayingNumber(e.target.value)}
                    placeholder="Playing #" className="rounded-xl px-4 py-3.5 text-sm w-36" style={field} />
                  <select value={revealPos} onChange={e => setRevealPos(e.target.value)}
                    className="rounded-xl px-4 py-3.5 text-sm w-44" style={field}>
                    <option value="">Reveal: Auto</option>
                    <option value="P">Reveal as P</option>
                    <option value="C">Reveal as C</option>
                    <option value="IF">Reveal as IF</option>
                    <option value="OF">Reveal as OF</option>
                  </select>
                  <label className="flex items-center gap-3 text-sm font-bold cursor-pointer select-none rounded-xl transition-all"
                    style={{
                      color: under18 ? P.orange : P.text,
                      border: `1px solid ${under18 ? P.orange : P.purple + '40'}`,
                      background: under18 ? `${P.orange}15` : 'transparent',
                      padding: '13px 22px',
                    }}>
                    <input type="checkbox" checked={under18} onChange={e => setUnder18(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: P.orange }} />
                    Under 18
                  </label>
                </div>
              </div>

              {/* Photo panel */}
              <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '28px', marginBottom: '24px', boxShadow: `0 0 40px ${P.orange}0E` }}>
                <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.orange, marginBottom: '16px' }}>3 · Photo (optional)</p>
                <p className="text-xs leading-relaxed" style={{ color: P.dim, marginBottom: '14px' }}>
                  <b style={{ color: P.text }}>AI cut-out</b> for an ordinary match photo — it reads the person, and can drop a bat or glove held clear of the body.
                  <br /><b style={{ color: P.text }}>Already cut out</b> when the file has real transparency — nothing is removed, it just trims to the edges.
                  <br /><b style={{ color: P.text }}>On black</b> when the cut-out was saved onto black. Dark kit and helmets survive.
                  <br /><b style={{ color: P.text }}>Green screen</b> for a studio shoot on green.
                </p>
                <div className="flex gap-3 flex-wrap" style={{ marginBottom: '18px' }}>
                  {MODES.map(([k, label]) => (
                    <button key={k} onClick={() => setMode(k)} disabled={busy}
                      className="text-[11px] font-black uppercase tracking-widest rounded-full transition-all disabled:opacity-40"
                      style={{
                        padding: '11px 22px',
                        color: mode === k ? P.ink : P.text,
                        background: mode === k ? P.blue : 'transparent',
                        border: `1px solid ${mode === k ? P.blue : P.purple + '40'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <input type="file" accept="image/*" disabled={busy}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  className="w-full rounded-xl px-4 py-3.5 text-sm disabled:opacity-40" style={field} />

                {preview && (
                  <div className="rounded-xl text-center" style={{
                    marginTop: '22px', padding: '26px',
                    background: 'linear-gradient(160deg, #0E1B33, #1A2F55)',
                    border: `1px solid ${P.blue}30`,
                  }}>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: P.blue, marginBottom: '14px' }}>Cut-out preview (on card navy)</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Cut-out preview" style={{ maxHeight: '320px', margin: '0 auto' }} />
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="text-center" style={{ marginTop: '36px' }}>
                <button onClick={save} disabled={busy || !playerId}
                  className="text-base font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                  style={{
                    color: P.ink,
                    background: `linear-gradient(120deg, ${P.purple} 0%, ${P.orange} 100%)`,
                    padding: '18px 64px',
                    boxShadow: `0 0 30px ${P.purple}50`,
                  }}>
                  {busy ? 'Working…' : 'Save Player'}
                </button>
              </div>
            </>
          )}

          {/* Status — sits with the work it reports on, above the bulk tool */}
          {statusPanel}

          {/* Bulk numbers — September team confirmations */}
          <div className="rounded-2xl" style={{ background: P.panel, border: `1px solid ${P.panelEdge}`, padding: '28px', marginTop: '48px', boxShadow: `0 0 40px ${P.purple}12` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: P.purple, marginBottom: '8px' }}>Bulk numbers · {grade === 'mens' ? "Men's" : "Women's"}</p>
            <p className="text-xs" style={{ color: P.dim, marginBottom: '16px' }}>
              Paste one player per line as “Name, Number”. Preview shows matches before anything is written. Writing overwrites existing numbers.
            </p>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={"Floyd Nola, 99\nThomas Enoka, 7"}
              className="w-full rounded-xl px-4 py-3.5 text-sm"
              style={{ ...field, minHeight: '140px', fontFamily: 'monospace' }} />
            <div className="flex gap-4" style={{ marginTop: '16px' }}>
              <button onClick={() => runBulk(false)} disabled={bulkBusy || !bulkText.trim()}
                className="text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.blue, border: `1px solid ${P.blue}70`, padding: '13px 30px' }}>
                Preview
              </button>
              <button onClick={() => runBulk(true)} disabled={bulkBusy || !bulkResult || bulkResult.matched.length === 0}
                className="text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03] disabled:opacity-40"
                style={{ color: P.ink, background: `linear-gradient(120deg, ${P.purple} 0%, ${P.orange} 100%)`, padding: '13px 30px' }}>
                Write numbers
              </button>
            </div>
            {bulkResult && (
              <div style={{ marginTop: '20px' }}>
                {bulkResult.matched.length > 0 && (
                  <div className="text-xs" style={{ color: P.text, marginBottom: '12px' }}>
                    <p className="font-black uppercase tracking-widest" style={{ color: P.blue, marginBottom: '6px' }}>Matched ({bulkResult.matched.length})</p>
                    {bulkResult.matched.map((m, i) => (
                      <p key={i}>{m.name} → #{m.number}{m.had != null && m.had !== m.number ? ` (was #${m.had})` : ''}</p>
                    ))}
                  </div>
                )}
                {bulkResult.unmatched.length > 0 && (
                  <div className="text-xs" style={{ color: '#FF9B9B' }}>
                    <p className="font-black uppercase tracking-widest" style={{ marginBottom: '6px' }}>Unmatched — fix by hand ({bulkResult.unmatched.length})</p>
                    {bulkResult.unmatched.map((u, i) => <p key={i}>{u}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}