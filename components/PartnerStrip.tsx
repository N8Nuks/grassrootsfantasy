import { livePartners } from '@/lib/partners'

/* A quiet row of partner logos. Deliberately small and muted — they're here to
   be acknowledged, not to compete with the page. Tapping any of them goes to
   the partners page for the detail. */
export default function PartnerStrip({ align = 'center' }: { align?: 'center' | 'left' }) {
  const partners = livePartners()
  if (partners.length === 0) return null

  return (
    <div style={{ borderTop: '1px dashed #ffffff14', paddingTop: '22px', marginTop: '34px' }}>
      <p className="text-[9px] font-black uppercase tracking-[0.3em]"
        style={{ color: '#F5F1E835', textAlign: align, marginBottom: '14px' }}>
        NFS Premier League partners
      </p>
      <div className="flex flex-wrap items-center gap-3"
        style={{ justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        {partners.map(p => (
          <a key={p.key} href="/nfs/sponsors" title={p.name}
            className="rounded-lg flex items-center justify-center transition-opacity hover:opacity-100"
            style={{
              width: '62px', height: '62px',
              background: p.tile ?? '#0D0D0F',
              border: '1px solid #ffffff14',
              opacity: 0.72,
            }}>
            {p.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.logo} alt={p.name} style={{ maxWidth: '76%', maxHeight: '76%', width: 'auto', height: 'auto' }} />
            ) : (
              <span className="text-[8px] font-black uppercase text-center"
                style={{ color: p.accent, padding: '0 4px', lineHeight: 1.2 }}>{p.name}</span>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}