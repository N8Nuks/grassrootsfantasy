'use client'
import { useState } from 'react'

export type ManagerNotice = { id: string; title: string; body: string }

type Palette = { surface: string; surfaceRaised: string; text: string; textDim: string; accent: string }

export default function ManagerNotices({ notices, T }: { notices: ManagerNotice[]; T: Palette }) {
  const [open, setOpen] = useState<ManagerNotice[]>(notices)

  async function dismiss(id: string) {
    setOpen(prev => prev.filter(n => n.id !== id))
    await fetch('/api/dismiss-manager-notice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  if (open.length === 0) return null
  return (
    <div style={{ maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto' }}>
      {open.map(n => (
        <div key={n.id} className="rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`,
            border: `2px solid ${T.accent}70`,
            boxShadow: `0 0 26px ${T.accent}22`,
            padding: '20px 22px',
            marginBottom: '22px',
          }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: T.accent, marginBottom: '8px' }}>
                {n.title}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: T.text }}>{n.body}</p>
            </div>
            <button onClick={() => dismiss(n.id)} className="text-xl font-black shrink-0" style={{ color: T.textDim }}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}