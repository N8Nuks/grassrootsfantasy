const COLUMNS: { title: string; accent: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Play',
    accent: '#3FBF63',
    links: [
      { label: 'My Team', href: '/team' },
      { label: 'Matchups', href: '/matchups' },
      { label: 'Ladder', href: '/ladder' },
      { label: 'Leaders', href: '/leaders' },
      { label: 'Manager Report', href: '/analytics' },
      { label: 'Arcade', href: '/arcade' },
    ],
  },
  {
    title: 'NFS Premier League',
    accent: '#2456E6',
    links: [
      { label: 'League home', href: '/nfs' },
      { label: 'Fixtures', href: '/nfs/fixtures' },
      { label: 'Scoring', href: '/nfs/scoring' },
      { label: 'Honours Board', href: '/nfs/honours' },
      { label: 'Officials Wing', href: '/nfs/officials' },
    ],
  },
  {
    title: 'Learn',
    accent: '#E8983A',
    links: [
      { label: 'How it works', href: '/how' },
      { label: 'FAQ', href: '/faq' },
      { label: 'The Cards', href: '/cards' },
      { label: 'Athlete Hall', href: '/hall' },
      { label: 'Player Policy', href: '/policy' },
    ],
  },
  {
    title: 'Grassroots Fantasy',
    accent: '#7FC4FF',
    links: [
      { label: 'Leagues', href: '/leagues' },
      { label: 'Join', href: '/join' },
      { label: 'Log in', href: '/login' },
      { label: 'Contact', href: 'mailto:info@grassrootsfantasy.co.nz' },
      { label: 'Black Diamond Labs', href: 'https://blackdiamondlabs.co.nz', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #ffffff0a', background: '#100E0C' }}>
      <style>{`
        @keyframes bdl-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .bdl-shimmer {
          background: linear-gradient(90deg, #8A8A8A 0%, #C0C0C0 35%, #FFFFFF 50%, #C0C0C0 65%, #8A8A8A 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: bdl-shimmer 4s linear infinite;
        }
        .gf-foot-link { color: #F5F1E8A6; font-size: 13px; line-height: 1.2; display: inline-block; padding: 6px 0; transition: color 150ms ease; }
        .gf-foot-link:hover { color: #F5F1E8; }
        .gf-foot-link:focus-visible { outline: 2px solid #3FBF63; outline-offset: 3px; border-radius: 3px; }
      `}</style>

      {/* Directory */}
      <div style={{ maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto', padding: '48px 24px 36px' }}>
        <nav aria-label="Site directory" className="grid grid-cols-2 lg:grid-cols-4" style={{ columnGap: '32px', rowGap: '36px' }}>
          {COLUMNS.map(col => (
            <div key={col.title}>
              <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: col.accent, marginBottom: '12px' }}>
                {col.title === 'Grassroots Fantasy'
                  ? <><span style={{ color: '#3FBF63' }}>Grassroots</span> Fantasy</>
                  : col.title}
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {col.links.map(l => (
                  <li key={l.href}>
                    <a href={l.href} className="gf-foot-link"
                      {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Baseline */}
      <div style={{ borderTop: '1px solid #ffffff0a' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left"
          style={{ maxWidth: '1100px', marginLeft: 'auto', marginRight: 'auto', padding: '22px 24px', gap: '14px' }}>
          <a href="https://blackdiamondlabs.co.nz" className="bdl-shimmer text-xs font-semibold hover:opacity-80 transition-opacity">
            Platform delivered by Black Diamond Labs Ltd
          </a>
          <a href="https://instagram.com/grassrootsfantasy" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#F5F1E8]/40 hover:text-[#F5F1E8]/70 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="h-3.5 w-3.5" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            @grassrootsfantasy
          </a>
          <a href="mailto:info@grassrootsfantasy.co.nz" className="text-xs text-[#F5F1E8]/40 hover:text-[#F5F1E8]/70 transition-colors">
            info@grassrootsfantasy.co.nz
          </a>
        </div>
      </div>
    </footer>
  )
}