'use client'

const SILVER = '#1D3FBE'
const GOLD = '#E8C15A'

export type OfficialCardData = {
  name: string
  games: number
  role: 'umpire' | 'scorer'
  retired: boolean
  since: string | null
  level?: number | null      // officials grade by passing Levels 1–7
  photoUrl?: string | null
}

/* Officials get the same card language as players — tier-style frame, banner,
   portrait area, gem corner — with career games where the stat table sits and
   the officiating Level where a player's number goes. */
export default function OfficialCard({ o }: { o: OfficialCardData }) {
  const accent = o.role === 'umpire' ? SILVER : GOLD
  const roleWord = o.role === 'umpire' ? 'Umpire' : 'Scorer'
  const verb = o.role === 'umpire' ? 'Umpired' : 'Scored'

  return (
    <div className="w-full rounded-2xl flex flex-col"
      style={{
        aspectRatio: '5 / 7',
        padding: '5px',
        background: `linear-gradient(165deg, ${accent} 0%, ${accent}55 40%, ${accent}25 100%)`,
        boxShadow: `0 0 22px ${accent}28`,
      }}>
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: '#121215', border: '1px solid #F5F1E820' }}>

        {/* Banner — role, name, level gem */}
        <div className="flex items-center gap-2 pinstripe-fine"
          style={{ flex: '0 0 auto', background: '#0D0D0F', borderBottom: `1px solid ${accent}40`, padding: '9px 10px' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.25em] truncate" style={{ color: `${accent}B0` }}>
              {roleWord}
            </p>
            <p className="text-sm font-black leading-tight truncate" style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8' }}>
              {o.name}
            </p>
          </div>

          {/* Gem corner — the officiating Level, where a player's number sits */}
          <div className="shrink-0 flex items-center justify-center"
            style={{
              width: '40px', height: '40px',
              background: `linear-gradient(150deg, ${accent} 0%, ${accent}60 100%)`,
              clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)',
              boxShadow: `0 0 12px ${accent}60`,
              padding: '2px',
            }}>
            <span className="w-full h-full flex flex-col items-center justify-center"
              style={{ background: '#0D0D0F', clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)' }}>
              <span className="text-[5px] font-black uppercase tracking-[0.15em]" style={{ color: `${accent}C0` }}>Level</span>
              <span className="text-base font-black leading-none"
                style={{ fontFamily: 'var(--font-heading)', color: accent, textShadow: `0 0 8px ${accent}70` }}>
                {o.level ?? '#'}
              </span>
            </span>
          </div>
        </div>

        {/* Portrait area */}
        <div className="relative flex items-end justify-center overflow-hidden"
          style={{ flex: '1 1 auto', minHeight: 0, background: '#121215' }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(115deg, transparent 0%, transparent 44%, ${accent}22 44%, ${accent}22 54%, transparent 54%),
                         linear-gradient(180deg, ${accent}18 0%, #121215 88%)`,
          }} />
          {o.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.photoUrl} alt={o.name} className="relative"
              style={{ height: '94%', width: 'auto', maxWidth: '92%', objectFit: 'contain', objectPosition: 'bottom',
                       filter: 'drop-shadow(0 4px 14px #00000070)' }} />
          ) : (
            <svg width="46%" viewBox="0 0 60 80" fill="none" className="relative" style={{ maxHeight: '86%' }}>
              <circle cx="30" cy="22" r="13" fill={`${accent}70`} />
              <path d="M6 80 C6 52 54 52 54 80 Z" fill={`${accent}70`} />
            </svg>
          )}
          {o.retired && (
            <span className="absolute top-2 right-2.5 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ color: '#F5F1E890', background: '#00000070' }}>
              Retired
            </span>
          )}
        </div>

        {/* Career games — the single figure, where a player's stat table sits */}
        <div className="text-center"
          style={{ flex: '0 0 auto', background: '#0D0D0F', borderTop: `1px solid ${accent}40`, padding: '10px 10px 12px' }}>
          <p className="text-3xl font-black leading-none"
            style={{ fontFamily: 'var(--font-heading)', color: accent, textShadow: `0 0 14px ${accent}55` }}>
            {o.games}
          </p>
          <p className="text-[8px] font-black uppercase tracking-[0.28em]" style={{ color: `${accent}A0`, marginTop: '5px' }}>
            Games {verb}
          </p>
          {o.since && (
            <p className="text-[8px] uppercase tracking-widest" style={{ color: '#F5F1E855', marginTop: '4px' }}>
              Reached {o.since}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}