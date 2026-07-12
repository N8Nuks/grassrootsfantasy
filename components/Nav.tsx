'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_RED, JOIN_GOLD } from '@/lib/clubhouse'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const pathname = usePathname()

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

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  // Right-side nav links
  const links = [
    { label: 'Leagues', href: '/leagues', color: '#39FF6A', glow: '0 0 10px #39FF6A60' },
    ...(!loggedIn ? [{ label: 'How it works', href: '/how' }] : []),
    ...(loggedIn ? [
      { label: 'My Team', href: '/team', color: '#39FF6A', glow: '0 0 10px #39FF6A60' },
      { label: 'Matchups', href: '/matchups' },
      { label: 'Ladder', href: '/ladder' },
    ] : []),
  ]

  const underline = (href: string, color?: string) =>
    isActive(href)
      ? { borderBottom: `2px solid ${color ?? '#F5F1E8'}`, paddingBottom: '3px' }
      : { borderBottom: '2px solid transparent', paddingBottom: '3px' }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 py-4 bg-[#141210]/90 backdrop-blur-md border-b border-white/5">
        {/* Left: logo + Join GF + Admin */}
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/gf-mark.png" alt="" className="h-9 w-auto" />
            <span className="hidden sm:flex flex-col leading-none gap-0.5">
              <span className="text-[13px] font-bold tracking-wide" style={{ color: '#3FBF63', fontFamily: 'var(--font-heading)' }}>GRASSROOTS</span>
              <span className="text-[13px] font-black tracking-wider" style={{ color: '#F5F1E8', fontFamily: 'var(--font-wordmark)', fontStretch: '125%' }}>FANTASY</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-3">
            <a href="/join"
              className="text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all hover:scale-[1.03]"
              style={{
                fontFamily: 'var(--font-label)',
                color: JOIN_GOLD,
                border: `1px solid ${JOIN_GOLD}`,
                ...(isActive('/join') ? { background: `${JOIN_GOLD}18` } : {}),
              }}>
              Join GF
            </a>
            {isAdmin && (
              <a href="/admin"
                className="text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all hover:scale-[1.03]"
                style={{
                  fontFamily: 'var(--font-label)',
                  color: ADMIN_RED,
                  border: `1px solid ${ADMIN_RED}`,
                  ...(isActive('/admin') ? { background: `${ADMIN_RED}18` } : {}),
                }}>
                Admin
              </a>
            )}
          </div>
        </div>

        {/* Right: page links + auth */}
        <div className="hidden md:flex items-center gap-10 lg:gap-14">
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-xs font-bold uppercase tracking-widest transition-colors"
              style={{
                fontFamily: 'var(--font-label)',
                color: l.color || '#F5F1E880',
                textShadow: l.glow || 'none',
                ...underline(l.href, l.color),
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
          <a href="/join"
            className="text-2xl font-black uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-label)', color: JOIN_GOLD }}
            onClick={() => setOpen(false)}>
            Join GF
          </a>
          {isAdmin && (
            <a href="/admin"
              className="text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-label)', color: ADMIN_RED }}
              onClick={() => setOpen(false)}>
              Admin
            </a>
          )}
          {links.map(l => (
            <a key={l.label} href={l.href}
              className="text-2xl font-black uppercase tracking-widest"
              style={{
                fontFamily: 'var(--font-label)',
                color: l.color || '#F5F1E8',
                textShadow: l.glow || 'none',
                ...(isActive(l.href) ? { borderBottom: `2px solid ${l.color ?? '#F5F1E8'}` } : {}),
              }}
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
