'use client'
import { useState } from 'react'

export default function Nav() {
  const [open, setOpen] = useState(false)

  const links = [
    { label: 'How it works', href: '/how' },
    { label: 'Cards', href: '/cards' },
    { label: 'NFS Edition', href: '/nfs' },
    { label: 'FAQ', href: '/faq' },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 bg-[#141210]/90 backdrop-blur-md border-b border-white/5">
        <a href="/" className="flex items-center">
          <img src="/gf-logo-transparent.png" alt="Grassroots Fantasy" className="h-9 w-auto" />
        </a>

        {/* Desktop links — spread out */}
        <div className="hidden md:flex items-center gap-12 lg:gap-16">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-xs font-bold uppercase tracking-widest text-[#F5F1E8]/50 hover:text-[#F5F1E8] transition-colors">
              {l.label}
            </a>
          ))}
          <a href="/nfs#register"
            className="rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#141210] transition-all hover:opacity-90"
            style={{ background: '#E8D5A3' }}>
            Register
          </a>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-9 md:hidden"
          style={{ background: '#141210F5' }}
          onClick={() => setOpen(false)}>
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-2xl font-black text-[#F5F1E8] uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-heading)' }}
              onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="/nfs#register"
            className="rounded-full px-8 py-3 text-sm font-black uppercase tracking-widest text-[#141210] mt-4"
            style={{ background: '#E8D5A3' }}
            onClick={() => setOpen(false)}>
            Register
          </a>
        </div>
      )}
    </>
  )
}