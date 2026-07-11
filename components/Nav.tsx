'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setLoggedIn(true)
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (profile?.is_admin) setIsAdmin(true)
    })
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const links = [
    { label: 'Leagues', href: '/leagues', color: '#39FF6A', glow: '0 0 10px #39FF6A60' },
    { label: 'How it works', href: '/how' },
    { label: 'Cards', href: '/cards' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Join GF', href: '/join', color: '#E8C15A' },
    ...(loggedIn ? [
      { label: 'My Team', href: '/team', color: '#39FF6A', glow: '0 0 10px #39FF6A60' },
      { label: 'Matchups', href: '/matchups' },
      { label: 'Ladder', href: '/ladder' },
    ] : []),
    ...(isAdmin ? [{ label: 'Admin', href: '/admin', color: '#E8C15A' }] : []),
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 bg-[#141210]/90 backdrop-blur-md border-b border-white/5">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/gf-mark.png" alt="" className="h-9 w-auto" />
          <span className="hidden sm:flex flex-col leading-none gap-0.5">
            <span className="text-[13px] font-bold tracking-wide" style={{ color: '#3FBF63', fontFamily: 'var(--font-heading)' }}>GRASSROOTS</span>
            <span className="text-[13px] font-black tracking-wider" style={{ color: '#F5F1E8', fontFamily: 'var(--font-wordmark)', fontStretch: '125%' }}>FANTASY</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10 lg:gap-14">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-xs font-bold uppercase tracking-widest transition-colors"
              style={{
                fontFamily: 'var(--font-label)',
                color: l.color || '#F5F1E880',
                textShadow: l.glow || 'none',
              }}>
              {l.label}
            </a>
          ))}
          <button onClick={loggedIn ? logout : () => (window.location.href = '/login')}
            className="text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ fontFamily: 'var(--font-label)', color: '#F5F1E850' }}>
            {loggedIn ? 'Log out' : 'Log in'}
          </button>
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
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          style={{ background: '#141210F5' }}
          onClick={() => setOpen(false)}>
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-label)', color: l.color || '#F5F1E8', textShadow: l.glow || 'none' }}
              onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <button onClick={loggedIn ? logout : () => (window.location.href = '/login')}
            className="text-2xl font-black uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-label)', color: '#F5F1E870' }}>
            {loggedIn ? 'Log out' : 'Log in'}
          </button>
        </div>
      )}
    </>
  )
}