'use client'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { theme, type Grade } from '@/lib/clubhouse'
import { splitName } from '@/lib/names'

// Field Selector — My Team's field view.
// Field on the left two-thirds, the whole squad on the right third.
// Tap a position: eligible names light up, the rest darken and lock.
// Then tap a lit name, or drag it across onto the position.
// Non-fielding slots (DP, P(B), DR, bench, reserves) sit in the dugout under the field.

export type FieldSelectorCard = { id: string; playerId: string; name: string; positions: string[] }
type SlotState = { slot: string; card_id: string; batting_order: number | null }

// Positions as a percentage of the field box (260 x 440 drawing)
const FIELD_SLOTS: { slot: string; x: number; y: number }[] = [
  { slot: 'CF', x: 50, y: 14 },
  { slot: 'LF', x: 19.5, y: 27 },
  { slot: 'RF', x: 80.5, y: 27 },
  { slot: 'SS', x: 32.5, y: 45.5 },
  { slot: 'B2', x: 67.5, y: 45.5 },
  { slot: 'B3', x: 17.5, y: 64 },
  { slot: 'B1', x: 82.5, y: 64 },
  { slot: 'P', x: 50, y: 66 },
  { slot: 'C', x: 50, y: 90.5 },
]
const SPECIAL_SLOTS = ['DP', 'PB', 'DR']
const BENCH_SLOTS = ['BENCH1', 'BENCH2', 'BENCH3', 'BENCH4']
const RES_SLOTS = ['RES1', 'RES2', 'RES3', 'RES4', 'RES5']

const LABELS: Record<string, string> = {
  P: 'P', C: 'C', B1: '1B', B2: '2B', B3: '3B', SS: 'SS',
  LF: 'LF', CF: 'CF', RF: 'RF', DP: 'DP', PB: 'P(B)', DR: 'DR',
  BENCH1: 'B1', BENCH2: 'B2', BENCH3: 'B3', BENCH4: 'B4',
  RES1: 'R1', RES2: 'R2', RES3: 'R3', RES4: 'R4', RES5: 'R5',
}

// Squad list order: by main (first listed) position, then surname
const POSITION_ORDER = ['P', 'C', 'B1', 'B2', 'B3', 'SS', 'LF', 'CF', 'RF']
function mainIndex(positions: string[]): number {
  for (const p of positions) {
    const i = POSITION_ORDER.indexOf(p)
    if (i >= 0) return i
  }
  return 99
}

const CAPTAIN_GOLD = '#FFD700'
const VICE_SILVER = '#C9D2DE'

export default function FieldSelector({ grade, siteTheme, cards, slots, unavailable, captainId, viceCaptainId, eligible, onAssign, onClear }: {
  grade: Grade
  siteTheme: string
  cards: FieldSelectorCard[]
  slots: SlotState[]
  unavailable: Set<string>                              // player ids out this round
  captainId: string | null
  viceCaptainId: string | null
  eligible: (cardId: string, slot: string) => boolean
  onAssign: (slot: string, cardId: string) => void
  onClear: (slot: string) => void
}) {
  const T = theme(grade, siteTheme)
  const dirt = grade === 'mens' ? '#8A6A3B' : '#33507F'
  const grass = '#1F5132'
  const line = '#F5F1E850'

  const [sel, setSel] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null)
  const [note, setNote] = useState('')
  const drag = useRef<{ id: string; sx: number; sy: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const cleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => { cleanup.current?.() }, [])

  const cardById = new Map(cards.map(c => [c.id, c]))
  const cardBySlot = new Map(slots.map(s => [s.slot, cardById.get(s.card_id)]))
  const slotByCard = new Map(slots.map(s => [s.card_id, s.slot]))
  const last = (c: FieldSelectorCard) => splitName(c.name).last || c.name
  const first = (c: FieldSelectorCard) => splitName(c.name).first

  const squad = [...cards].sort((a, b) => {
    const d = mainIndex(a.positions) - mainIndex(b.positions)
    return d !== 0 ? d : last(a).localeCompare(last(b))
  })

  function place(slot: string, cardId: string) {
    const c = cardById.get(cardId)
    if (!c) return
    if (!eligible(cardId, slot)) {
      setNote(`${last(c)} can't play ${LABELS[slot] ?? slot}.`)
      return
    }
    onAssign(slot, cardId)
    setSel(null)
    setNote('')
  }

  function tapSlot(slot: string) {
    setNote('')
    setSel(prev => (prev === slot ? null : slot))
  }

  function tapName(cardId: string) {
    if (justDragged.current) { justDragged.current = false; return }
    if (!sel) { setNote('Tap a position first, or drag this name onto the field.'); return }
    place(sel, cardId)
  }

  // Drag: sideways pulls the name out of the list; up and down still scrolls it
  function startDrag(cardId: string, e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    cleanup.current?.()
    drag.current = { id: cardId, sx: e.clientX, sy: e.clientY, moved: false }
    justDragged.current = false
    const move = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 8) d.moved = true
      if (d.moved) setGhost({ id: d.id, x: ev.clientX, y: ev.clientY })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      cleanup.current = null
      drag.current = null
    }
    const up = (ev: PointerEvent) => {
      const d = drag.current
      stop()
      setGhost(null)
      if (!d || !d.moved) return
      justDragged.current = true
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const slot = el?.closest('[data-slot]')?.getAttribute('data-slot')
      if (slot) place(slot, d.id)
    }
    const cancel = () => { stop(); setGhost(null) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    cleanup.current = stop
  }

  const ghostCard = ghost ? cardById.get(ghost.id) : null

  function chip(slot: string, pos?: { x: number; y: number }) {
    const c = cardBySlot.get(slot)
    const isSel = sel === slot
    const isTarget = !!ghost && eligible(ghost.id, slot)
    const isBlocked = !!ghost && !isTarget
    const lit = isSel || isTarget
    const isOut = !!c && unavailable.has(c.playerId)
    const band = c && captainId === c.id ? 'C' : c && viceCaptainId === c.id ? 'VC' : null
    return (
      <button key={slot} type="button" data-slot={slot} onClick={() => tapSlot(slot)}
        aria-label={`${LABELS[slot] ?? slot}${c ? `, ${c.name}` : ', empty'}`}
        aria-pressed={isSel}
        className="flex flex-col items-center justify-center transition-all"
        style={{
          ...(pos
            ? { position: 'absolute' as const, left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)', width: '29%' }
            : { position: 'relative' as const, width: '100%' }),
          height: '42px',
          minWidth: 0,
          padding: '0 3px',
          gap: '3px',
          borderRadius: '9px',
          background: lit ? `${T.accent}30` : c ? '#141210E6' : '#14121099',
          border: lit ? `2px solid ${T.accent}` : c ? `1px solid ${T.accent}55` : '1.5px dashed #F5F1E860',
          boxShadow: lit ? T.glow : 'none',
          opacity: isBlocked ? 0.35 : 1,
          cursor: 'pointer',
        }}>
        <span className="font-black" style={{ fontSize: '9px', letterSpacing: '0.08em', lineHeight: 1, color: T.accent }}>
          {LABELS[slot] ?? slot}
        </span>
        <span className="font-black uppercase truncate" style={{ fontSize: '10px', lineHeight: 1, maxWidth: '100%', color: c ? T.text : T.textDim, opacity: isOut ? 0.5 : 1 }}>
          {c ? last(c) : 'Empty'}
        </span>
        {band && (
          <span className="font-black flex items-center justify-center"
            style={{ position: 'absolute', top: '-6px', right: '-4px', minWidth: '16px', height: '16px', padding: '0 3px', borderRadius: '999px', fontSize: '8px', color: '#141210', background: band === 'C' ? CAPTAIN_GOLD : VICE_SILVER }}>
            {band}
          </span>
        )}
      </button>
    )
  }

  const selCard = sel ? cardBySlot.get(sel) : null
  const canClear = !!sel && !!selCard && (sel.startsWith('BENCH') || sel.startsWith('RES'))
  const hint = note
    ? note
    : sel
      ? `${LABELS[sel] ?? sel} selected · tap or drag a lit name`
      : 'Tap a position, then tap or drag a name onto it'

  const groupLabel = (text: string) => (
    <p className="font-black uppercase" style={{ fontSize: '9px', letterSpacing: '0.25em', color: T.textDim, margin: '10px 0 5px' }}>{text}</p>
  )

  return (
    <div style={{ maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
      <div className="flex items-center justify-between" style={{ minHeight: '32px', gap: '10px', marginBottom: '8px' }}>
        <p className="text-[11px] font-black" style={{ color: note ? '#FF9B9B' : T.accent }}>{hint}</p>
        {canClear && (
          <button type="button" onClick={() => { onClear(sel!); setSel(null) }}
            className="text-[10px] font-black uppercase tracking-widest rounded-full shrink-0"
            style={{ color: '#FF9B9B', border: '1px solid #FF6B6B', padding: '7px 12px' }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '8px' }}>

        {/* Left two-thirds — the field, then the dugout */}
        <div style={{ minWidth: 0 }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '260 / 440' }}>
            <svg viewBox="0 0 260 440" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
              {/* Fence and outfield */}
              <path d="M130 428 L10 262 L10 132 Q10 18 130 18 Q250 18 250 132 L250 262 Z"
                fill={grass} stroke={T.accent} strokeWidth="2.5" strokeLinejoin="round" />
              {/* Foul lines */}
              <path d="M130 428 L10 262 M130 428 L250 262" stroke={line} strokeWidth="1.5" fill="none" />
              {/* Skinned infield */}
              <path d="M130 376 L226 280 L130 184 L34 280 Z" fill={dirt} stroke={dirt} strokeWidth="22" strokeLinejoin="round" opacity={0.55} />
              {/* Base paths and pitcher's circle */}
              <path d="M130 350 L200 280 L130 210 L60 280 Z" fill="none" stroke={line} strokeWidth="1.5" />
              <circle cx="130" cy="288" r="20" fill="none" stroke={line} strokeWidth="1.5" />
              {/* Bases and home plate */}
              <rect x="124" y="204" width="12" height="12" fill="#F5F1E8" transform="rotate(45 130 210)" />
              <rect x="54" y="274" width="12" height="12" fill="#F5F1E8" transform="rotate(45 60 280)" />
              <rect x="194" y="274" width="12" height="12" fill="#F5F1E8" transform="rotate(45 200 280)" />
              <path d="M123 344 L137 344 L137 351 L130 358 L123 351 Z" fill="#F5F1E8" />
            </svg>
            {FIELD_SLOTS.map(f => chip(f.slot, { x: f.x, y: f.y }))}
          </div>

          {/* Dugout — the slots that don't take the field */}
          <div style={{ marginTop: '10px' }}>
            {groupLabel('Dugout')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
              {SPECIAL_SLOTS.map(s => chip(s))}
            </div>
            {groupLabel('Bench · 0.75×')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
              {BENCH_SLOTS.map(s => chip(s))}
            </div>
            {groupLabel('Reserve · no score')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
              {RES_SLOTS.map(s => chip(s))}
            </div>
          </div>
        </div>

        {/* Right third — the whole squad, scrolling inside the height of the left column */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <div className="rounded-xl flex flex-col" style={{ position: 'absolute', inset: 0, background: T.surface, border: '1px solid #ffffff12', overflow: 'hidden' }}>
            <div className="flex items-baseline justify-between" style={{ padding: '8px 8px 6px' }}>
              <span className="font-black uppercase" style={{ fontSize: '9px', letterSpacing: '0.25em', color: T.textDim }}>Squad</span>
              <span className="font-black" style={{ fontSize: '10px', color: T.textDim }}>{cards.length}</span>
            </div>
            <div className="flex flex-col" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 5px 8px', gap: '4px' }}>
              {squad.map(c => {
                const ok = sel ? eligible(c.id, sel) : true
                const lit = !!sel && ok
                const inSlot = slotByCard.get(c.id)
                const isOut = unavailable.has(c.playerId)
                const dragging = ghost?.id === c.id
                return (
                  <button key={c.id} type="button" disabled={!ok}
                    onPointerDown={e => startDrag(c.id, e)}
                    onClick={() => tapName(c.id)}
                    className="text-left transition-all"
                    style={{
                      flex: 'none',
                      width: '100%',
                      minWidth: 0,
                      padding: '6px 7px',
                      borderRadius: '8px',
                      touchAction: 'pan-y',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      background: lit ? `${T.accent}26` : ok ? T.surfaceRaised : 'transparent',
                      border: lit ? `1.5px solid ${T.accent}` : ok ? '1px solid #ffffff14' : '1px solid #ffffff08',
                      opacity: dragging ? 0.4 : ok ? (isOut ? 0.55 : 1) : 0.3,
                      cursor: ok ? 'grab' : 'not-allowed',
                    }}>
                    <span className="block truncate" style={{ fontSize: '9px', lineHeight: 1.2, color: T.textDim }}>{first(c)}</span>
                    <span className="block truncate font-black uppercase" style={{ fontSize: '11px', lineHeight: 1.25, fontFamily: 'var(--font-heading)', color: lit ? T.accent : T.text }}>
                      {last(c)}
                    </span>
                    <span className="flex items-center justify-between" style={{ gap: '4px', marginTop: '2px' }}>
                      <span className="truncate" style={{ fontSize: '9px', lineHeight: 1.2, color: T.textDim }}>
                        {c.positions.filter(p => POSITION_ORDER.includes(p)).map(p => LABELS[p] ?? p).join(' ')}
                        {isOut ? ' · OUT' : ''}
                      </span>
                      {inSlot && (
                        <span className="font-black shrink-0" style={{ fontSize: '8px', lineHeight: 1, padding: '3px 5px', borderRadius: '999px', color: T.buttonText, background: T.button }}>
                          {LABELS[inSlot] ?? inSlot}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* The name under the finger while dragging */}
      {ghost && ghostCard && (
        <div className="font-black uppercase"
          style={{
            position: 'fixed', left: ghost.x, top: ghost.y, transform: 'translate(-50%, -130%)',
            zIndex: 60, pointerEvents: 'none', whiteSpace: 'nowrap',
            padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
            color: T.buttonText, background: T.button, boxShadow: '0 6px 18px #00000080',
          }}>
          {last(ghostCard)}
        </div>
      )}
    </div>
  )
}