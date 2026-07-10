export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 bg-[#141210]/90 backdrop-blur-md border-b border-white/5">
      <a href="/" className="flex items-center gap-3">
        <img src="/gf-logo.jpg" alt="Grassroots Fantasy" className="h-9 w-auto rounded" />
      </a>
      <div className="flex items-center gap-5 sm:gap-8">
        <a href="/how" className="text-xs font-bold uppercase tracking-widest text-[#F5F1E8]/50 hover:text-[#F5F1E8] transition-colors hidden sm:block">How it works</a>
        <a href="/cards" className="text-xs font-bold uppercase tracking-widest text-[#F5F1E8]/50 hover:text-[#F5F1E8] transition-colors hidden sm:block">Cards</a>
        <a href="/nfs" className="text-xs font-bold uppercase tracking-widest text-[#F5F1E8]/50 hover:text-[#F5F1E8] transition-colors hidden sm:block">NFS Edition</a>
        <a href="/faq" className="text-xs font-bold uppercase tracking-widest text-[#F5F1E8]/50 hover:text-[#F5F1E8] transition-colors hidden sm:block">FAQ</a>
        <a href="/nfs#register" className="rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90" style={{ background: '#E8D5A3' }}>
          Register
        </a>
      </div>
    </nav>
  )
}
