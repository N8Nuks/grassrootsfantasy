'use client'
import type { Palette } from '@/lib/clubhouse'
 
export default function GradeSwitch({ grade, mensHref, womensHref, palette, onImage = false }: {
  grade: 'mens' | 'womens'
  mensHref: string
  womensHref: string
  palette?: Palette
  onImage?: boolean       // sitting on a textured banner — solid track, brighter inactive label
}) {
  const mensFill = palette ? palette.button : '#FFC425'
  const womensFill = palette ? palette.button : '#4D7FFF'
  const activeText = palette ? palette.buttonText : '#141210'
  const inactiveText = onImage ? (palette?.text ?? '#F5F1E8') : '#F5F1E870'
  const shimmerClass = palette?.shimmer ? ' gf-shimmer' : ''
 
  const seg = (active: boolean, fill: string) => ({
    color: active ? activeText : inactiveText,
    background: active ? fill : 'transparent',
    padding: '14px 32px',
    minHeight: '44px',
    textShadow: !active && onImage ? '0 1px 3px #000000' : 'none',
  })
  return (
    <div className="inline-flex rounded-full overflow-hidden"
      style={{ border: `1px solid ${onImage ? '#ffffff40' : '#ffffff25'}`, background: onImage ? '#141210E6' : 'transparent' }}>
      <a href={mensHref}
        className={"text-xs font-black uppercase tracking-widest transition-all flex items-center" + (grade === 'mens' ? shimmerClass : '')}
        style={seg(grade === 'mens', mensFill)}>
        Men&apos;s
      </a>
      <a href={womensHref}
        className={"text-xs font-black uppercase tracking-widest transition-all flex items-center" + (grade === 'womens' ? shimmerClass : '')}
        style={{ ...seg(grade === 'womens', womensFill), borderLeft: '1px solid #ffffff15' }}>
        Women&apos;s
      </a>
    </div>
  )
}
 
