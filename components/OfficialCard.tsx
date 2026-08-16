'use client'

const SILVER = '#7FC4FF'
const GOLD = '#E8C15A'

export type OfficialCardData = {
  name: string
  games: number
  role: 'umpire' | 'scorer'
  retired: boolean
  since: string | null
  level?: number | null      // officials grade by passing Levels 1–7
  photoUrl?: string | null
  strap?: string | null      // record cards carry a headline above the banner
  featured?: boolean         // the two records — bigger, lit, shimmering
}

/* Officials get the same card language as players — tier-style frame, banner,
   portrait area, gem corner — with career games where the stat table sits and
   the officiating Level where a player's number goes.

   `featured` is the record treatment: crackling rim, shimmering name, diamond
   career figure. Same card, turned up. */
export default function OfficialCard({ o }: { o: OfficialCardData }) {
  const accent = o.role === 'umpire' ? SILVER : GOLD
  const roleWord = o.role === 'umpire' ? 'Umpire' : 'Scorer'
  const verb = o.role === 'umpire' ? 'Umpired' : 'Scored'
  const big = !!o.featured

  return (
    <div className={"w-full rounded-2xl flex flex-col relative" + (big ? ' gf-rim' : '')}
      style={{
        aspectRatio: big ? '5 / 8.2' : '5 / 7.4',
        padding: big ? '7px' : '5px',
        background: `linear-gradient(165deg, ${accent} 0%, ${accent}55 40%, ${accent}25 100%)`,
        boxShadow: big ? `0 0 40px ${accent}55, 0 0 90px ${accent}22` : `0 0 22px ${accent}28`,
        ...(big ? { ['--rim' as string]: `${accent}90` } : {}),
      }}>
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
        style={{ background: '#121215', border: '1px solid #F5F1E820' }}>

        {/* Record headline */}
        {big && o.strap && (
          <div className="text-center" style={{ background: '#0D0D0F', borderBottom: `1px solid ${accent}30`, padding: '10px 10px 8px' }}>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] leading-tight"
              style={{ color: accent, textShadow: `0 0 14px ${accent}90` }}>{o.strap}</p>
          </div>
        )}

        {/* Banner — role, name, level gem */}
        <div className="flex items-center gap-2 pinstripe-fine"
          style={{ flex: '0 0 auto', background: '#0D0D0F', borderBottom: `1px solid ${accent}40`, padding: big ? '11px 12px' : '9px 10px' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.25em] truncate" style={{ color: `${accent}B0` }}>
              {roleWord}
            </p>
            {/* Long names wrap rather than clip */}
            <p className={(big ? 'text-base sm:text-xl' : 'text-sm') + ' font-black leading-tight break-words' + (big ? ' gf-shimmer-text' : '')}
              style={big
                ? { fontFamily: 'var(--font-heading)' }
                : { fontFamily: 'var(--font-heading)', color: '#F5F1E8' }}>
              {o.name}
            </p>
          </div>

          {/* Gem corner — the officiating Level, where a player's number sits */}
          <div className="shrink-0 flex items-center justify-center"
            style={{
              width: big ? '46px' : '38px', height: big ? '46px' : '38px',
              background: `linear-gradient(150deg, ${accent} 0%, ${accent}60 100%)`,
              clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)',
              boxShadow: `0 0 ${big ? 16 : 12}px ${accent}70`,
              padding: '2px',
            }}>
            <span className="w-full h-full flex flex-col items-center justify-center"
              style={{ background: '#0D0D0F', clipPath: 'polygon(50% 0%, 100% 28%, 100% 72%, 50% 100%, 0% 72%, 0% 28%)' }}>
              <span className="text-[5px] font-black uppercase tracking-[0.15em]" style={{ color: `${accent}C0` }}>Level</span>
              <span className={(big ? 'text-lg' : 'text-base') + ' font-black leading-none'}
                style={{ fontFamily: 'var(--font-heading)', color: accent, textShadow: `0 0 8px ${accent}70` }}>
                {o.level ?? '#'}
              </span>
            </span>
          </div>
        </div>

        {/* Portrait area */}
        <div className="relative flex items-end justify-center overflow-hidden"
          style={{ flex: '1 1 auto', minHeight: 0, background: '#121215' }}>
          {/* Base wash */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(180deg, ${accent}18 0%, #121215 88%)`,
          }} />

          {/* Role motif — scorers get the scorebook grid, umpires the chalked
              plate and batter's boxes. Faint, so the portrait always leads. */}
          {o.role === 'scorer' ? (
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 120 160" fill="none" style={{ opacity: 0.16 }}>
              <defs>
                <pattern id="officials-scorebook" width="24" height="24" patternUnits="userSpaceOnUse">
                  <rect width="24" height="24" fill="none" stroke={accent} strokeWidth="0.7" />
                  {/* the diamond inside every cell — the signature of a scoresheet */}
                  <path d="M12 5 L19 12 L12 19 L5 12 Z" fill="none" stroke={accent} strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect x="-4" y="-4" width="128" height="168" fill="url(#officials-scorebook)"
                transform="rotate(-6 60 80)" />
              {/* heavier rule, like the innings divider */}
              <line x1="-10" y1="46" x2="130" y2="40" stroke={accent} strokeWidth="1.4" opacity="0.7" />
              <line x1="-10" y1="118" x2="130" y2="112" stroke={accent} strokeWidth="1.4" opacity="0.7" />
            </svg>
          ) : (
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 120 160" fill="none" style={{ opacity: 0.18 }}>
              {/* Chalked home plate and batter's boxes, seen from behind the plate */}
              <g stroke={accent} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" fill="none">
                <path d="M52 112 L68 112 L70 122 L60 130 L50 122 Z" />
                <path d="M30 92 L48 92 L44 134 L22 134 Z" />
                <path d="M90 92 L72 92 L76 134 L98 134 Z" />
                {/* foul lines running away to the outfield */}
                <path d="M50 112 L4 62" strokeWidth="1.1" opacity="0.6" />
                <path d="M70 112 L116 62" strokeWidth="1.1" opacity="0.6" />
              </g>
            </svg>
          )}

          {/* Energy slash, as on the player cards */}
          <div className="absolute inset-0" style={{
            background: `linear-gradient(115deg, transparent 0%, transparent 44%, ${accent}18 44%, ${accent}18 54%, transparent 54%)`,
          }} />
          {big && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="gf-sheen absolute top-0 bottom-0"
                style={{ width: '70px', background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
            </div>
          )}
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
          style={{ flex: '0 0 auto', background: '#0D0D0F', borderTop: `1px solid ${accent}40`, padding: big ? '13px 10px 15px' : '10px 10px 12px' }}>
          <p className={(big ? 'text-5xl sm:text-6xl gf-diamond-text' : 'text-3xl') + ' font-black leading-none'}
            style={big
              ? { fontFamily: 'var(--font-heading)' }
              : { fontFamily: 'var(--font-heading)', color: accent, textShadow: `0 0 14px ${accent}55` }}>
            {o.games}
          </p>
          <p className={(big ? 'text-[9px]' : 'text-[8px]') + ' font-black uppercase tracking-[0.25em]'}
            style={{ color: `${accent}A0`, marginTop: big ? '8px' : '5px' }}>
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