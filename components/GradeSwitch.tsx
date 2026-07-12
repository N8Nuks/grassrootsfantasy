'use client'

export default function GradeSwitch({ grade, mensHref, womensHref }: {
  grade: 'mens' | 'womens'
  mensHref: string
  womensHref: string
}) {
  const seg = (active: boolean, fill: string) => ({
    color: active ? '#141210' : '#F5F1E870',
    background: active ? fill : 'transparent',
    padding: '14px 32px',
    minHeight: '44px',
  })
  return (
    <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff25' }}>
      <a href={mensHref}
        className="text-xs font-black uppercase tracking-widest transition-all flex items-center"
        style={seg(grade === 'mens', '#FFC425')}>
        Men&apos;s
      </a>
      <a href={womensHref}
        className="text-xs font-black uppercase tracking-widest transition-all flex items-center"
        style={{ ...seg(grade === 'womens', '#4D7FFF'), borderLeft: '1px solid #ffffff15' }}>
        Women&apos;s
      </a>
    </div>
  )
}