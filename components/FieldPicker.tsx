'use client'
import { theme, type Grade } from '@/lib/clubhouse'

// Generic softball field diagram.
// Modes: picker (eligible slots tappable) and display (pass occupants to show
// a whole lineup standing on the diamond — future Field View of the lineup card).
// Size hierarchy: starters (field + specialists) largest, bench smaller, reserves smallest.

const FIELD_SLOTS: { slot: string; label: string; x: number; y: number }[] = [
  { slot: 'CF', label: 'CF', x: 200, y: 42 },
  { slot: 'LF', label: 'LF', x: 78, y: 82 },
  { slot: 'RF', label: 'RF', x: 322, y: 82 },
  { slot: 'SS', label: 'SS', x: 138, y: 150 },
  { slot: 'B2', label: '2B', x: 262, y: 150 },
  { slot: 'B3', label: '3B', x: 76, y: 218 },
  { slot: 'B1', label: '1B', x: 324, y: 218 },
  { slot: 'P', label: 'P', x: 200, y: 198 },
  { slot: 'C', label: 'C', x: 200, y: 266 },
]

const SPECIAL_SLOTS = [
  { slot: 'DP', label: 'DP' },
  { slot: 'PB', label: 'P(B)' },
  { slot: 'DR', label: 'DR' },
]
const BENCH_SLOTS = ['BENCH1', 'BENCH2', 'BENCH3', 'BENCH4']
const RES_SLOTS = ['RES1', 'RES2', 'RES3', 'RES4', 'RES5']

export default function FieldPicker({ grade, eligible, current, occupants, onSelect }: {
  grade: Grade
  eligible: Set<string>              // slots this player can be placed into
  current?: string | null            // slot the player currently holds
  occupants?: Map<string, string>    // slot -> surname (optional, display mode)
  onSelect: (slot: string) => void
}) {
  const T = theme(grade)
  const dirt = grade === 'mens' ? '#8A6A3B' : '#33507F'
  const grass = grade === 'mens' ? '#241C13' : '#0F1B36'
  const line = '#F5F1E830'

  const surname = (slot: string) => occupants?.get(slot)

  function Plate({ slot, label, x, y }: { slot: string; label: string; x: number; y: number }) {
    const can = eligible.has(slot)
    const isCur = current === slot
    const occ = surname(slot)
    return (
      <g onClick={() => can && onSelect(slot)} style={{ cursor: can ? 'pointer' : 'default' }}>
        {isCur && (
          <rect x={x - 32} y={y - 19} width={64} height={38} rx={10}
            fill="none" stroke={T.accent} strokeWidth={2.5} opacity={0.9}>
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite" />
          </rect>
        )}
        <rect x={x - 28} y={y - 16} width={56} height={32} rx={8}
          fill={can ? T.accent : '#ffffff10'}
          stroke={can ? 'none' : '#ffffff15'} strokeWidth={1} />
        <text x={x} y={y + 5} textAnchor="middle"
          fontSize="14" fontWeight="900"
          fill={can ? '#141210' : '#F5F1E835'}
          style={{ userSelect: 'none', fontFamily: 'var(--font-label)' }}>
          {label}
        </text>
        {occ && (
          <text x={x} y={y + 30} textAnchor="middle" fontSize="10" fontWeight="700"
            fill={T.text} opacity={0.8} style={{ userSelect: 'none' }}>
            {occ}
          </text>
        )}
      </g>
    )
  }

  const boxStyle = (slot: string, tier: 'starter' | 'bench' | 'reserve') => {
    const can = eligible.has(slot)
    const isCur = current === slot
    const pad = tier === 'starter' ? '14px 0' : tier === 'bench' ? '9px 0' : '6px 0'
    return {
      color: can ? '#141210' : `${T.textDim}`,
      background: can ? T.accent : '#ffffff08',
      border: isCur ? `2px solid ${T.accent}` : '1px solid #ffffff15',
      opacity: can ? (tier === 'reserve' ? 0.9 : 1) : (tier === 'reserve' ? 0.35 : 0.5),
      cursor: can ? 'pointer' : 'default',
      boxShadow: isCur ? T.glow : 'none',
      padding: pad,
      minWidth: 0,
    } as const
  }

  return (
    <div>
      {/* The diamond */}
      <svg viewBox="0 0 400 310" className="w-full" style={{ display: 'block' }}>
        {/* Outfield */}
        <path d="M 30 240 Q 200 -40 370 240 L 370 310 L 30 310 Z" fill={grass} />
        <path d="M 30 240 Q 200 -40 370 240" fill="none" stroke={line} strokeWidth="1.5" />
        {/* Infield dirt */}
        <path d="M 200 292 L 108 208 Q 200 118 292 208 Z" fill={dirt} opacity={0.5} />
        {/* Base lines */}
        <path d="M 200 292 L 96 196 M 200 292 L 304 196" stroke={line} strokeWidth="1.5" fill="none" />
        {/* Bases */}
        <rect x="196" y="288" width="9" height="9" fill="#F5F1E8" transform="rotate(45 200 292)" />
        <rect x="99" y="199" width="8" height="8" fill="#F5F1E890" transform="rotate(45 103 203)" />
        <rect x="293" y="199" width="8" height="8" fill="#F5F1E890" transform="rotate(45 297 203)" />
        <rect x="196" y="112" width="8" height="8" fill="#F5F1E890" transform="rotate(45 200 116)" />
        {/* Mound */}
        <circle cx="200" cy="208" r="10" fill={dirt} opacity={0.8} />

        {/* GF mark — top-right corner of the field */}
        <image href="/gf-mark.png" x="342" y="8" width="48" height="48" opacity="0.55" />

        {FIELD_SLOTS.map(f => <Plate key={f.slot} {...f} />)}
      </svg>

      {/* Specialist slots — starter weight */}
      <div className="grid grid-cols-3 gap-3" style={{ marginTop: '16px' }}>
        {SPECIAL_SLOTS.map(s => (
          <button key={s.slot} onClick={() => eligible.has(s.slot) && onSelect(s.slot)}
            className="rounded-lg text-sm font-black text-center uppercase tracking-widest transition-all"
            style={boxStyle(s.slot, 'starter')}>
            {s.label}
            {surname(s.slot) && <span className="block text-[10px] font-bold normal-case tracking-normal" style={{ opacity: 0.75 }}>{surname(s.slot)}</span>}
          </button>
        ))}
      </div>

      {/* Bench strip — smaller */}
      <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim, margin: '16px 0 6px' }}>Bench</p>
      <div className="grid grid-cols-4 gap-2">
        {BENCH_SLOTS.map((s, i) => (
          <button key={s} onClick={() => eligible.has(s) && onSelect(s)}
            className="rounded-lg text-xs font-black text-center transition-all"
            style={boxStyle(s, 'bench')}>
            B{i + 1}
            {surname(s) && <span className="block text-[9px] font-bold" style={{ opacity: 0.75 }}>{surname(s)}</span>}
          </button>
        ))}
      </div>

      {/* Reserve strip — smallest */}
      <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim, margin: '12px 0 5px' }}>Reserve</p>
      <div className="grid grid-cols-5 gap-1.5">
        {RES_SLOTS.map((s, i) => (
          <button key={s} onClick={() => eligible.has(s) && onSelect(s)}
            className="rounded-lg text-[10px] font-black text-center transition-all"
            style={boxStyle(s, 'reserve')}>
            R{i + 1}
            {surname(s) && <span className="block text-[8px] font-bold" style={{ opacity: 0.75 }}>{surname(s)}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}