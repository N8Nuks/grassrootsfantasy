'use client'
import { useMemo, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import type { PhotoPlayer } from './page'

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
  if (top >= bottom || left >= right) return blob // nothing visible — return as-is

  const w = right - left + 1
  const h = bottom - top + 1
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  out.getContext('2d')!.drawImage(canvas, left, top, w, h, 0, 0, w, h)
  return new Promise(resolve => out.toBlob(b => resolve(b!), 'image/png'))
}

export default function PhotosClient({ players }: { players: PhotoPlayer[] }) {
  const [grade, setGrade] = useState<'mens' | 'womens'>('mens')
  const [playerId, setPlayerId] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [cutout, setCutout] = useState<Blob | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const gradePlayers = useMemo(
    () => players.filter(p => p.grade === grade),
    [players, grade]
  )
  const selected = players.find(p => p.id === playerId)

  const field = { background: '#181510', border: '1px solid #ffffff15', color: '#F5F1E8' }

  async function handleFile(file: File) {
    setBusy(true)
    setCutout(null)
    setPreview(null)
    setStatus('Cutting out background… (first run downloads the tool, can take a minute)')
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const removed = await removeBackground(file)
      setStatus('Trimming to fit…')
      const trimmed = await trimTransparent(removed)
      setCutout(trimmed)
      setPreview(URL.createObjectURL(trimmed))
      setStatus('Cut-out ready. Check it, then upload.')
    } catch (e) {
      setStatus('ERROR cutting out: ' + (e instanceof Error ? e.message : String(e)))
    }
    setBusy(false)
  }

  async function upload() {
    if (!cutout || !playerId) return
    setBusy(true)
    setStatus('Uploading…')
    const form = new FormData()
    form.append('file', new File([cutout], 'photo.png', { type: 'image/png' }))
    form.append('player_id', playerId)
    const res = await fetch('/api/upload-photo', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setStatus('ERROR: ' + data.error); setBusy(false); return }
    setStatus(`✓ Photo saved for ${data.name}`)
    setBusy(false)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '90px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: '#E8C15A' }}>GF Admin</p>
            <h1 className="text-3xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>Player Photos</h1>
            <p className="text-xs text-[#F5F1E8]/40 mt-2">Pick a player, choose a photo, the background is cut out and trimmed automatically, check it, upload. Re-uploading replaces the old photo.</p>
          </div>

          <div className="flex gap-4 mb-4">
            <select value={grade} onChange={e => { setGrade(e.target.value as 'mens' | 'womens'); setPlayerId('') }}
              className="rounded-lg px-4 py-3 text-sm w-40" style={field}>
              <option value="mens">Men&apos;s</option>
              <option value="womens">Women&apos;s</option>
            </select>
            <select value={playerId} onChange={e => setPlayerId(e.target.value)}
              className="rounded-lg px-4 py-3 text-sm flex-1" style={field}>
              <option value="">— Select player —</option>
              {gradePlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.club_id}){p.photo_url ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="mb-4 text-xs text-[#F5F1E8]/50 text-center">
              {selected.photo_url ? 'This player already has a photo — uploading will replace it.' : 'No photo yet.'}
            </div>
          )}

          <input type="file" accept="image/*" disabled={!playerId || busy}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            className="w-full rounded-lg px-4 py-3 text-sm disabled:opacity-40" style={field} />

          {preview && (
            <div className="mt-6 rounded-xl p-6 text-center"
              style={{ background: 'linear-gradient(160deg, #0E1B33, #1A2F55)', border: '1px solid #ffffff12' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#F5F1E8]/50">Cut-out preview (on card navy)</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Cut-out preview" style={{ maxHeight: '320px', margin: '0 auto' }} />
            </div>
          )}

          <div className="text-center mt-6">
            <button onClick={upload} disabled={busy || !cutout || !playerId}
              className="text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-40"
              style={{ color: '#E8C15A', border: '1px solid #E8C15A', background: 'transparent', padding: '16px 56px' }}>
              {busy ? 'Working…' : 'Upload Photo'}
            </button>
          </div>

          {status && (
            <pre className="mt-8 rounded-lg p-5 text-xs leading-relaxed whitespace-pre-wrap"
              style={{ background: '#181510', border: '1px solid #ffffff10', color: status.startsWith('ERROR') ? '#FF6B6B' : '#3FBF63' }}>
              {status}
            </pre>
          )}
        </div>
      </section>
      <Footer />
    </main>
  )
}