import { partner } from '@/lib/partners'

/* An award credit rather than an advert. Sits under a competition header and
   names who puts the prize up. Returns nothing until PARTNERS_LIVE is true, so
   this can sit in place ahead of the announcement. */
export const PARTNERS_LIVE = false

export default function PresentedBy({ partnerKey, award }: { partnerKey: string; award: string }) {
  if (!PARTNERS_LIVE) return null
  const p = partner(partnerKey)
  if (!p) return null

  return (
    <a href="/nfs/sponsors" className="flex items-center gap-2.5 transition-opacity hover:opacity-100"
      style={{ opacity: 0.8, marginTop: '10px' }}>
      <span className="rounded flex items-center justify-center shrink-0"
        style={{ width: '30px', height: '30px', background: p.tile ?? '#0D0D0F', border: '1px solid #ffffff18' }}>
        {p.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.logo} alt="" style={{ maxWidth: '76%', maxHeight: '76%', width: 'auto', height: 'auto' }} />
        )}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#F5F1E845', lineHeight: 1.4 }}>
        {award}
        <span style={{ display: 'block', color: p.accent }}>{p.name}</span>
      </span>
    </a>
  )
}