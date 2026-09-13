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

  const boxLink = (href: string, color: string) => ({
    fontFamily: 'var(--font-label)',
    color,
    border: `1px solid ${color}`,
    ...(isActive(href) ? { background: `${color}18` } : {}),
  })

  /* The nav carries the weekly loop only. Leaders, the NFS pages, Cards, FAQ
     and Policy live in the footer directory. Join GF disappears once you're in. */
  const boxes = [
    ...(!loggedIn ? [{ label: 'Join GF', href: '/join', color: JOIN_GOLD }] : []),
    { label: 'Leagues', href: '/leagues', color: '#39FF6A' },
    { label: 'Arcade', href: '/arcade', color: '#B47CFF', match: '/games' },
    ...(isAdmin ? [{ label: 'Admin', href: '/admin', color: ADMIN_RED }] : []),
  ]

  const links = [
    ...(!loggedIn ? [{ label: 'How it works', href: '/how' }] : []),
    ...(loggedIn ? [
      { label: 'My Team', href: '/team', color: '#4DA6FF', glow: '0 0 8px #4DA6FF, 0 0 18px #4DA6FF90, 0 0 30px #4DA6FF50' },
      { label: 'Matchups', href: '/matchups', color: '#F5F1E8' },
      { label: 'Ladder', href: '/ladder', color: '#F5F1E8' },
      { label: 'Athlete Hall', href: '/hall', color: '#3FBF63', glow: '0 0 10px #3FBF6390, 0 0 22px #3FBF6340' },
    ] : []),
  ]

  const underline = (href: string, color?: string) =>
    isActive(href)
      ? { borderBottom: `2px solid ${color ?? '#F5F1E8'}`, paddingBottom: '3px' }
      : { borderBottom: '2px solid transparent', paddingBottom: '3px' }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 bg-[#141210]/40 backdrop-blur-md border-b border-white/5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', paddingBottom: '14px' }}>
        {/* Left: logo + boxed links */}
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gf-mark.png" alt="" className="h-9 w-auto" />
            <span className="flex flex-col leading-none gap-0.5">
              <span className="text-[12px] sm:text-[13px] font-bold tracking-wide" style={{ color: '#3FBF63', fontFamily: 'var(--font-heading)' }}>GRASSROOTS</span>
              <span className="text-[12px] sm:text-[13px] font-black tracking-wider" style={{ color: '#F5F1E8', fontFamily: 'var(--font-wordmark)', fontStretch: '125%' }}>FANTASY</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-3">
            {boxes.map(b => (
              <a key={b.href} href={b.href}
                className="text-xs font-bold uppercase tracking-widest px-4 py-2 transition-all hover:scale-[1.03]"
                style={boxLink(b.match ?? b.href, b.color)}>
                {b.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right: page links + auth */}
        <div className="hidden md:flex items-center gap-10 lg:gap-14" style={{ paddingRight: '24px' }}>
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
            className="text-sm font-bold uppercase tracking-widest transition-colors hover:text-[#F5F1E8]"
            style={{ fontFamily: 'var(--font-label)', color: '#F5F1E870' }}>
            {loggedIn ? 'Log out' : 'Log in'}
          </button>
        </div>

        {/* Mobile hamburger — inset from the screen edge */}
        <button className="md:hidden flex flex-col gap-1.5 p-2" style={{ marginRight: '10px' }} onClick={() => setOpen(!open)} aria-label="Menu">
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-px w-6 bg-[#F5F1E8] transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center md:hidden overflow-y-auto"
          style={{
            background: '#141210F5',
            gap: '26px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 96px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
          }}
          onClick={() => setOpen(false)}>
          {boxes.map(b => (
            <a key={b.href} href={b.href}
              className="text-2xl font-black uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-label)', color: b.color }}
              onClick={() => setOpen(false)}>
              {b.label}
            </a>
          ))}
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