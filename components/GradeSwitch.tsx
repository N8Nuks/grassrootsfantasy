'use client'
import type { Palette } from '@/lib/clubhouse'

export default function GradeSwitch({ grade, mensHref, womensHref, palette }: {
  grade: 'mens' | 'womens'
  mensHref: string
  womensHref: string
  palette?: Palette
}) {
  const mensFill = palette ? palette.button : '#FFC425'
  const womensFill = palette ? palette.button : '#4D7FFF'
  const activeText = palette ? palette.buttonText : '#141210'
  const shimmerClass = palette?.shimmer ? ' gf-shimmer' : ''

  const seg = (active: boolean, fill: string) => ({
    color: active ? activeText : '#F5F1E870',
    background: active ? fill : 'transparent',
    padding: '14px 32px',
    minHeight: '44px',
  })
  return (
    <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25' }}>
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