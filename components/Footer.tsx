export default function Footer() {
  return (
    <footer className="px-6 sm:px-12 py-10" style={{ borderTop: '1px solid #ffffff0a', background: '#100E0C' }}>
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
      `}</style>
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-5">
        <a href="https://blackdiamondlabs.co.nz" className="bdl-shimmer text-xs font-semibold hover:opacity-80 transition-opacity">
          Platform delivered by Black Diamond Labs Ltd
        </a>
        <div className="flex items-center gap-5">
          <a href="/policy" className="text-xs text-[#F5F1E8]/40 hover:text-[#F5F1E8]/70 transition-colors">
            Player policy
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
        </div>
        <a href="mailto:info@grassrootsfantasy.co.nz" className="text-xs text-[#F5F1E8]/40 hover:text-[#F5F1E8]/70 transition-colors">
          info@grassrootsfantasy.co.nz
        </a>
      </div>
    </footer>
  )
}