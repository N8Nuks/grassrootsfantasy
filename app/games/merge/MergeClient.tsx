'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

/* The tier ladder. The first four are the real card tiers; past a 2WP A the
   game keeps going into ranks that don't exist in the competition, which is
   what gives the board a top end worth chasing. */
const TIERS = [
  { v: 2,   short: 'C',    label: 'Common',   bg: '#123A22', fg: '#7FE0A0', edge: '#2D9E4E' },
  { v: 4,   short: 'E',    label: 'Elite',    bg: '#12224A', fg: '#8FB4FF', edge: '#1D3FBE' },
  { v: 8,   short: '2WP B', label: '2WP B',   bg: '#3A2F10', fg: '#E8C15A', edge: '#E8C15A' },
  { v: 16,  short: '2WP A', label: '2WP A',   bg: '#463400', fg: '#FFD700', edge: '#FFD700' },
  { v: 32,  short: 'ICON', label: 'Icon',     bg: '#3B1030', fg: '#FF6B9D', edge: '#FF2D95' },
  { v: 64,  short: 'LGND', label: 'Legend',   bg: '#0F3540', fg: '#5BE9FF', edge: '#00F0FF' },
  { v: 128, short: 'IMMORTAL', label: 'Immortal', bg: '#2A0F3F', fg: '#D6A6FF', edge: '#B47CFF' },
] as const

const meta = (v: number) => TIERS.find(t => t.v === v) ?? TIERS[TIERS.length - 1]
const SIZE = 4

type Cell = { id: number; v: number; r: number; c: number; merged?: boolean; born?: boolean }

let nextId = 1

export default function MergeClient() {
  const [cells, setCells] = useState<Cell[]>([])
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [peak, setPeak] = useState(2)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)

  const spawn = useCallback((list: Cell[]): Cell[] => {
    const free: [number, number][] = []
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!list.some(x => x.r === r && x.c === c)) free.push([r, c])
    }
    if (free.length === 0) return list
    const [r, c] = free[Math.floor(Math.random() * free.length)]
    return [...list, { id: nextId++, v: Math.random() < 0.88 ? 2 : 4, r, c, born: true }]
  }, [])

  const start = useCallback(() => {
    let list: Cell[] = []
    list = spawn(list); list = spawn(list)
    setCells(list); setScore(0); setPeak(2); setOver(false); setWon(false)
  }, [spawn])

  useEffect(() => { start() }, [start])

  const canMove = useCallback((list: Cell[]) => {
    if (list.length < SIZE * SIZE) return true
    for (const a of list) {
      for (const b of list) {
        if (a.v !== b.v) continue
        if ((Math.abs(a.r - b.r) === 1 && a.c === b.c) || (Math.abs(a.c - b.c) === 1 && a.r === b.r)) return true
      }
    }
    return false
  }, [])

  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setCells(prev => {
      if (over) return prev
      const grid: (Cell | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
      for (const cell of prev) grid[cell.r][cell.c] = { ...cell, merged: false, born: false }

      const vertical = dir === 'up' || dir === 'down'
      const back = dir === 'down' || dir === 'right'
      let gained = 0
      let moved = false
      let top = peak

      for (let line = 0; line < SIZE; line++) {
        // Pull the row or column out in travel order
        const strip: (Cell | null)[] = []
        for (let i = 0; i < SIZE; i++) strip.push(vertical ? grid[i][line] : grid[line][i])
        if (back) strip.reverse()

        const packed = strip.filter(Boolean) as Cell[]
        const out: Cell[] = []
        for (let i = 0; i < packed.length; i++) {
          const cur = packed[i]
          const nxt = packed[i + 1]
          if (nxt && cur.v === nxt.v && cur.v < TIERS[TIERS.length - 1].v) {
            const merged = { ...cur, v: cur.v * 2, merged: true }
            out.push(merged)
            gained += merged.v
            if (merged.v > top) top = merged.v
            i++
          } else {
            out.push({ ...cur })
          }
        }

        // Put them back at the leading edge
        for (let i = 0; i < SIZE; i++) {
          const cell = out[i] ?? null
          const idx = back ? SIZE - 1 - i : i
          const r = vertical ? idx : line
          const c = vertical ? line : idx
          if (cell) {
            if (cell.r !== r || cell.c !== c || cell.merged) moved = true
            cell.r = r; cell.c = c
          }
        }
        for (const cell of out) {
          if (vertical) grid[cell.r][cell.c] = cell
          else grid[cell.r][cell.c] = cell
        }
        // Clear anything left behind in this line
        for (let i = 0; i < SIZE; i++) {
          const r = vertical ? i : line
          const c = vertical ? line : i
          if (!out.some(x => x.r === r && x.c === c)) grid[r][c] = null
        }
      }

      if (!moved) return prev

      let list = grid.flat().filter(Boolean) as Cell[]
      list = spawn(list)
      setScore(s => {
        const n = s + gained
        setBest(b => Math.max(b, n))
        return n
      })
      setPeak(top)
      if (top >= TIERS[TIERS.length - 1].v) setWon(true)
      if (!canMove(list)) setOver(true)
      return list
    })
  }, [over, peak, spawn, canMove])

  // Keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      }
      const d = map[e.key]
      if (!d) return
      e.preventDefault()
      move(d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move])

  // Swipe
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    let sx = 0, sy = 0
    const start = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx
      const dy = e.changedTouches[0].clientY - sy
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return
      move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchend', end, { passive: true })
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end) }
  }, [move])

  const peakMeta = meta(peak)

  return (
    <>
      <style>{`
        .mg-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; margin-bottom: 20px; }
        .mg-hud { display: flex; gap: 22px; align-items: baseline; margin-bottom: 16px; flex-wrap: wrap; }
        .mg-hud span { font-size: 9px; font-weight: 900; letter-spacing: 0.24em; text-transform: uppercase; color: #5C6878; }
        .mg-hud b { font-family: var(--font-heading); font-size: 18px; color: #F5F1E8; margin-left: 7px; }

        .mg-board {
          position: relative; aspect-ratio: 1; padding: 9px; touch-action: none;
          background: #0A0D14; border: 1px solid color-mix(in srgb, var(--neon) 30%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .mg-slot { position: absolute; background: #ffffff06; }
        .mg-tile {
          position: absolute; display: flex; flex-direction: column;
          align-items: center; justify-content: center; overflow: hidden;
          transition: left 130ms cubic-bezier(.3,.9,.3,1), top 130ms cubic-bezier(.3,.9,.3,1);
        }
        .mg-short {
          font-family: var(--font-heading); font-weight: 900; line-height: 1;
          letter-spacing: -0.01em; text-align: center; padding: 0 4px;
        }
        .mg-pop { animation: mg-pop 190ms cubic-bezier(.2,1.7,.4,1); }
        @keyframes mg-pop { from { transform: scale(0.4); opacity: 0; } }
        .mg-hit { animation: mg-hit 220ms ease; }
        @keyframes mg-hit { 45% { transform: scale(1.14); } }

        .mg-ladder { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 22px; }
        .mg-rung {
          display: flex; align-items: center; gap: 7px; padding: 7px 11px;
          border: 1px solid #ffffff12; background: #ffffff05; font-size: 10px; color: #8FA0B4;
        }
        .mg-pip { width: 9px; height: 9px; flex-shrink: 0; }
        .mg-over {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px; text-align: center;
          background: #05060AE8; padding: 22px; z-index: 5;
        }
        .mg-key { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #3E4A58; text-align: center; margin-top: 14px; }
      `}</style>

      <p className="mg-lede">
        Two Commons make an Elite. Two Elites make a 2WP B. Keep going and the ladder runs past
        anything the competition deals — all the way to Immortal.
      </p>

      <div className="mg-hud">
        <span>Score <b>{score}</b></span>
        <span>Best <b style={{ color: 'var(--neon)' }}>{best}</b></span>
        <span>Top card <b style={{ color: peakMeta.fg }}>{peakMeta.label}</b></span>
      </div>

      <div className="mg-board" ref={boardRef}>
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const r = Math.floor(i / SIZE), c = i % SIZE
          const step = 100 / SIZE
          return <span key={`s${i}`} className="mg-slot"
            style={{ left: `calc(${c * step}% + 9px)`, top: `calc(${r * step}% + 9px)`,
                     width: `calc(${step}% - 8px)`, height: `calc(${step}% - 8px)` }} />
        })}

        {cells.map(cell => {
          const m = meta(cell.v)
          const step = 100 / SIZE
          const long = m.short.length > 5
          return (
            <span key={cell.id}
              className={'mg-tile' + (cell.born ? ' mg-pop' : '') + (cell.merged ? ' mg-hit' : '')}
              style={{
                left: `calc(${cell.c * step}% + 9px)`,
                top: `calc(${cell.r * step}% + 9px)`,
                width: `calc(${step}% - 8px)`,
                height: `calc(${step}% - 8px)`,
                background: m.bg,
                border: `1px solid ${m.edge}`,
                boxShadow: `0 0 16px ${m.edge}45, inset 0 0 22px ${m.edge}18`,
              }}>
              <span className="mg-short" style={{
                color: m.fg,
                fontSize: long ? 'clamp(9px, 2.6vw, 15px)' : 'clamp(15px, 5.4vw, 30px)',
                textShadow: `0 0 14px ${m.edge}70`,
              }}>{m.short}</span>
            </span>
          )
        })}

        {(over || won) && (
          <div className="mg-over">
            <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', color: won ? 'var(--neon)' : '#FF4D4D' }}>
              {won ? 'Immortal' : 'Board jammed'}
            </p>
            <p className="ar-num" style={{ fontSize: '52px', color: '#F5F1E8', textShadow: 'none', margin: '10px 0 2px' }}>{score}</p>
            <p style={{ fontSize: '11px', color: '#7D8B9C' }}>Best card: {peakMeta.label}</p>
            <button className="ar-btn" onClick={start} style={{ marginTop: '20px' }}><span>New board</span></button>
          </div>
        )}
      </div>

      <p className="mg-key">Arrow keys or WASD · swipe on a phone</p>

      <div className="mg-ladder">
        {TIERS.map(t => (
          <span key={t.v} className="mg-rung">
            <span className="mg-pip" style={{ background: t.edge, boxShadow: `0 0 8px ${t.edge}` }} />
            {t.label}
          </span>
        ))}
      </div>
    </>
  )
}