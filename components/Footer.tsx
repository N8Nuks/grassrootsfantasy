export default function Footer() {
  return (
    <footer className="px-6 sm:px-12 py-10" style={{ borderTop: '1px solid #ffffff0a', background: '#100E0C' }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <img src="/gf-logo-transparent.png" alt="Grassroots Fantasy" className="h-8 w-auto" />
        <p className="text-xs text-[#F5F1E8]/30 text-center" style={{ fontFamily: 'var(--font-body)' }}>
          Play along with your favourite players.
        </p>
        <div className="flex items-center gap-5">
          <a href="https://blackdiamondlabs.co.nz" className="text-xs text-[#F5F1E8]/30 hover:text-[#F5F1E8]/60 transition-colors">A Black Diamond Labs platform</a>
          <a href="mailto:info@blackdiamondlabs.co.nz" className="text-xs text-[#F5F1E8]/30 hover:text-[#F5F1E8]/60 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  )
}
