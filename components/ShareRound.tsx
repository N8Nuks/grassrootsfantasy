'use client'
import { useState } from 'react'

/* "Share my round": the manager picks one of three card looks, then shares
   the picture from their phone or saves it. The cards are drawn by
   /api/share-round, so what they see here is exactly what gets posted. */

type Grade = 'mens' | 'womens'
const STYLES: { key: 'a' | 'b' | 'c'; label: string }[] = [
  { key: 'a', label: 'Tech' },
  { key: 'b', label: 'Scoreboard' },
  { key: 'c', label: 'Top three' },
]

export default function ShareRound({ grade, roundLabel, accent, text, textDim, surface }: {
  grade: Grade
  roundLabel: string          // e.g. "Rd 7"
  accent: string
  text: string
  textDim: string
  surface: string
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<'a' | 'b' | 'c'>('a')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  // One stamp per opening, so the pictures are fresh but are not re-drawn on every tap
  const [stamp, setStamp] = useState(0)

  const src = (s: string) => `/api/share-round?grade=${grade}&style=${s}&v=${stamp}`
  const round = roundLabel.replace(/^Rd\s*/i, 'Round ')

  async function getFile(): Promise<File | null> {
    const res = await fetch(src(style))
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], `grassroots-fantasy-${round.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' })
  }

  function save(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  async function share(saveOnly: boolean) {
    setBusy(true); setNote(null)
    try {
      const file = await getFile()
      if (!file) { setNote('Could not make the picture. Try again in a moment.'); setBusy(false); return }
      const canShareFile = !saveOnly && typeof navigator !== 'undefined'
        && typeof navigator.share === 'function'
        && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
      if (canShareFile) {
        try {
          await navigator.share({ files: [file], text: `My ${round} in Grassroots Fantasy. grassrootsfantasy.co.nz` })
        } catch (err) {
          // Closing the share sheet is not an error
          if ((err as { name?: string })?.name !== 'AbortError') { save(file); setNote('Saved to your device.') }
        }
      } else {
        save(file)
        setNote('Saved to your device. Post it from your photos or downloads.')
      }
    } catch {
      setNote('Could not make the picture. Check your connection and try again.')
    }
    setBusy(false)
  }

  const pill = {
    fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
    borderRadius: '999px', minHeight: '44px', padding: '0 22px',
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
        <button type="button" onClick={() => { setStamp(Date.now()); setFailed(false); setNote(null); setOpen(true) }}
          style={{ ...pill, color: accent, border: `1px solid ${accent}`, background: 'transparent' }}>
          Share my {round}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Share my ${round}`}
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#000000D9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '380px', background: surface, border: `1px solid ${accent}50`, borderRadius: '18px', padding: '18px', margin: 'auto' }}>
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, textAlign: 'center' }}>
              Share my {round}
            </p>
            <p style={{ fontSize: '11px', color: textDim, textAlign: 'center', margin: '6px 0 14px' }}>Pick a card, then share or save it.</p>

            {/* The three looks */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {STYLES.map(s => {
                const on = style === s.key
                return (
                  <button key={s.key} type="button" onClick={() => { setStyle(s.key); setNote(null) }} aria-pressed={on}
                    style={{ flex: 1, padding: '4px 4px 8px', borderRadius: '10px', background: 'transparent',
                      border: on ? `2px solid ${accent}` : '2px solid #ffffff20', opacity: on ? 1 : 0.7 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(s.key)} alt={`${s.label} card`} onError={() => setFailed(true)}
                      style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: '6px', display: 'block', background: '#00000060' }} />
                    <span style={{ display: 'block', fontSize: '9px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: on ? accent : textDim, marginTop: '7px' }}>
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {failed ? (
              <p style={{ fontSize: '12px', color: text, textAlign: 'center', padding: '18px 8px' }}>
                Your card isn&apos;t ready yet. It appears once your team has a scored round.
              </p>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src(style)} alt={`Your ${round} card`}
                  style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: '12px', display: 'block', background: '#00000060', marginBottom: '14px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" disabled={busy} onClick={() => share(false)}
                    style={{ ...pill, flex: 1, color: '#07101F', background: accent, border: 'none', opacity: busy ? 0.5 : 1 }}>
                    {busy ? 'Working…' : 'Share'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => share(true)}
                    style={{ ...pill, flex: 1, color: accent, background: 'transparent', border: `1px solid ${accent}`, opacity: busy ? 0.5 : 1 }}>
                    Save image
                  </button>
                </div>
              </>
            )}
            {note && <p style={{ fontSize: '11px', color: textDim, textAlign: 'center', marginTop: '12px' }}>{note}</p>}
            <button type="button" onClick={() => setOpen(false)}
              style={{ ...pill, width: '100%', color: textDim, background: 'transparent', border: 'none', marginTop: '6px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
