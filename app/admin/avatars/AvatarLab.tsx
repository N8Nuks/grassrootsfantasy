'use client'
import { useState } from 'react'
import Avatar, { randomSeed, parseSeed, formatSeed, SILHOUETTES, COLOURWAYS, BACKDROPS, MOTIFS, FRAMES } from '@/components/Avatar'

export default function AvatarLab() {
  const [grid, setGrid] = useState<string[]>(() => Array.from({ length: 60 }, () => randomSeed()))
  const [pick, setPick] = useState<string>(randomSeed())
  const p = parseSeed(pick)

  function step(key: 's' | 'c' | 'd' | 'm' | 'f', len: number) {
    const next = { ...p, [key]: (p[key] + 1) % len }
    setPick(formatSeed(next))
  }

  const controls: [string, 's' | 'c' | 'd' | 'm' | 'f', number, string][] = [
    ['Silhouette', 's', SILHOUETTES.length, SILHOUETTES[p.s]],
    ['Colourway', 'c', COLOURWAYS.length, `#${p.c + 1}`],
    ['Backdrop', 'd', BACKDROPS.length, BACKDROPS[p.d]],
    ['Motif', 'm', MOTIFS.length, MOTIFS[p.m]],
    ['Frame', 'f', FRAMES.length, FRAMES[p.f]],
  ]

  return (
    <>
      {/* Single avatar, layer by layer */}
      <div className="rounded-2xl flex flex-col sm:flex-row items-center gap-8"
        style={{ background: '#121215', border: '1px solid #ffffff12', padding: '28px', marginBottom: '36px' }}>
        <div className="flex flex-col items-center gap-3 shrink-0">
          <Avatar seed={pick} size={140} />
          <code className="text-[11px]" style={{ color: '#ffffff60' }}>{pick}</code>
        </div>
        <div className="flex-1 w-full">
          <div className="grid gap-3 sm:grid-cols-2">
            {controls.map(([label, key, len, value]) => (
              <button key={key} onClick={() => step(key, len)}
                className="rounded-xl text-left transition-all hover:scale-[1.02]"
                style={{ background: '#1A1A22', border: '1px solid #ffffff15', padding: '12px 16px' }}>
                <span className="block text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: '#ffffff55' }}>{label}</span>
                <span className="block text-sm font-bold text-white" style={{ marginTop: '3px' }}>{value} <span style={{ color: '#ffffff40' }}>· 1 of {len}</span></span>
              </button>
            ))}
          </div>
          <button onClick={() => setPick(randomSeed())}
            className="text-xs font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
            style={{ color: '#0D0D0F', background: '#E8C15A', padding: '13px 28px', marginTop: '16px' }}>
            Reroll
          </button>
        </div>
      </div>

      {/* Variety check — sixty at once */}
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#ffffff55' }}>Sixty at random</p>
        <button onClick={() => setGrid(Array.from({ length: 60 }, () => randomSeed()))}
          className="text-[10px] font-black uppercase tracking-widest rounded-full"
          style={{ color: 'white', border: '1px solid #ffffff25', padding: '9px 20px' }}>
          Reroll all
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {grid.map((s, i) => <Avatar key={i} seed={s} size={64} />)}
      </div>

      {/* In context */}
      <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#ffffff55', margin: '36px 0 14px' }}>On a ladder row</p>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: '1px solid #ffffff12' }}>
        {['Weekend Warrior', 'KCBOOMBOOM', 'Fraggles Rocks', 'Numbnutts', 'Megsy'].map((name, i) => (
          <div key={name} className="flex items-center gap-4" style={{ borderBottom: '1px solid #ffffff08', padding: '14px 22px' }}>
            <span className="w-6 text-sm font-black" style={{ color: i === 0 ? '#E8C15A' : '#ffffff55' }}>{i + 1}</span>
            <Avatar seed={grid[i]} size={40} />
            <p className="flex-1 text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>{name}</p>
            <p className="text-base font-black text-white">{420 - i * 37}</p>
          </div>
        ))}
      </div>
    </>
  )
}