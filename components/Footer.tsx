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
        <div className="flex items-center gap-2.5">
          <img src="/gf-mark.png" alt="" className="h-8 w-auto" />
          <span className="flex flex-col leading-none gap-0.5">
            <span className="text-[12px] font-bold tracking-wide" style={{ color: '#3FBF63', fontFamily: 'var(--font-heading)' }}>GRASSROOTS</span>
            <span className="text-[12px] font-black tracking-wider" style={{ color: '#F5F1E8', fontFamily: 'var(--font-wordmark)', fontStretch: '125%' }}>FANTASY</span>
          </span>
        </div>
        <a href="https://blackdiamondlabs.co.nz" className="bdl-shimmer text-xs font-semibold text-center hover:opacity-80 transition-opacity">
          Platform delivered by Black Diamond Labs Ltd
        </a>
        <a href="mailto:info@grassrootsfantasy.co.nz" className="text-xs text-[#F5F1E8]/40 hover:text-[#F5F1E8]/70 transition-colors">
          info@grassrootsfantasy.co.nz
        </a>
      </div>
    </footer>
  )
}
