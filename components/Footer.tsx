export default function Footer() {
  return (
    <footer className="px-6 sm:px-12 py-10" style={{ borderTop: '1px solid #ffffff0a', background: '#100E0C' }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <img src="/gf-mark.png" alt="" className="h-8 w-auto" />
          <span className="flex flex-col leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            <span className="text-[12px] font-black tracking-wide" style={{ color: '#3FBF63' }}>GRASSROOTS</span>
            <span className="text-[15px] text-[#F5F1E8]" style={{ fontFamily: 'var(--font-script)' }}>Fantasy</span>
          </span>
        </div>
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
