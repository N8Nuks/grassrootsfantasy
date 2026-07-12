'use client'
import { theme, type Grade } from '@/lib/clubhouse'

// Generic softball field diagram.
// Modes: picker (eligible slots tappable) and display (pass occupants to show
// a whole lineup standing on the diamond — future Field View of the lineup card).

const FIELD_SLOTS: { slot: string; label: string; x: number; y: number }[] = [
  { slot: 'CF', label: 'CF', x: 200, y: 46 },
  { slot: 'LF', label: 'LF', x: 88, y: 84 },
  { slot: 'RF', label: 'RF', x: 312, y: 84 },
  { slot: 'SS', label: 'SS', x: 142, y: 152 },
  { slot: 'B2', label: '2B', x: 258, y: 152 },
  { slot: 'B3', label: '3B', x: 84, y: 216 },
  { slot: 'B1', label: '1B', x: 316, y: 216 },
  { slot: 'P', label: 'P', x: 200, y: 196 },
  { slot: 'C', label: 'C', x: 200, y: 262 },
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
          <rect x={x - 26} y={y - 15} width={52} height={30} rx={8}
            fill="none" stroke={T.accent} strokeWidth={2} opacity={0.9}>
            <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.6s" repeatCount="indefinite" />
          </rect>
        )}
        <rect x={x - 22} y={y - 12} width={44} height={24} rx={6}
          fill={can ? T.accent : '#ffffff10'}
          stroke={can ? 'none' : '#ffffff15'} strokeWidth={1} />
        <text x={x} y={y + 4} textAnchor="middle"
          fontSize="11" fontWeight="900"
          fill={can ? '#141210' : '#F5F1E835'}
          style={{ userSelect: 'none', fontFamily: 'var(--font-label)' }}>
          {label}
        </text>
        {occ && (
          <text x={x} y={y + 26} textAnchor="middle" fontSize="9" fontWeight="700"
            fill={T.text} opacity={0.75} style={{ userSelect: 'none' }}>
            {occ}
          </text>
        )}
      </g>
    )
  }

  const boxStyle = (slot: string) => {
    const can = eligible.has(slot)
    const isCur = current === slot
    return {
      color: can ? '#141210' : `${T.textDim}`,
      background: can ? T.accent : '#ffffff08',
      border: isCur ? `2px solid ${T.accent}` : '1px solid #ffffff15',
      opacity: can ? 1 : 0.5,
      cursor: can ? 'pointer' : 'default',
      boxShadow: isCur ? T.glow : 'none',
      padding: '10px 0',
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

        {FIELD_SLOTS.map(f => <Plate key={f.slot} {...f} />)}
      </svg>

      {/* Specialist slots */}
      <div className="grid grid-cols-3 gap-2" style={{ marginTop: '14px' }}>
        {SPECIAL_SLOTS.map(s => (
          <button key={s.slot} onClick={() => eligible.has(s.slot) && onSelect(s.slot)}
            className="rounded-lg text-xs font-black text-center uppercase tracking-widest transition-all"
            style={boxStyle(s.slot)}>
            {s.label}
            {surname(s.slot) && <span className="block text-[9px] font-bold normal-case tracking-normal" style={{ opacity: 0.75 }}>{surname(s.slot)}</span>}
          </button>
        ))}
      </div>

      {/* Bench strip */}
      <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim, margin: '14px 0 6px' }}>Bench</p>
      <div className="grid grid-cols-4 gap-2">
        {BENCH_SLOTS.map((s, i) => (
          <button key={s} onClick={() => eligible.has(s) && onSelect(s)}
            className="rounded-lg text-xs font-black text-center transition-all"
            style={boxStyle(s)}>
            B{i + 1}
            {surname(s) && <span className="block text-[9px] font-bold" style={{ opacity: 0.75 }}>{surname(s)}</span>}
          </button>
        ))}
      </div>

      {/* Reserve strip */}
      <p className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim, margin: '14px 0 6px' }}>Reserve</p>
      <div className="grid grid-cols-5 gap-2">
        {RES_SLOTS.map((s, i) => (
          <button key={s} onClick={() => eligible.has(s) && onSelect(s)}
            className="rounded-lg text-xs font-black text-center transition-all"
            style={boxStyle(s)}>
            R{i + 1}
            {surname(s) && <span className="block text-[9px] font-bold" style={{ opacity: 0.75 }}>{surname(s)}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}