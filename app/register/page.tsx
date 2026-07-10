'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [clubCode, setClubCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [grades, setGrades] = useState<('mens'|'womens')[]>(['mens'])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleRegister() {
    setError('')
    if (!email || !password || !teamName || !clubCode) {
      setError('Email, password, team name, and club code are required.')
      return
    }
    setBusy(true)
    const supabase = createClient()

    const { data: club } = await supabase.from('clubs').select('id').eq('code', clubCode.trim().toUpperCase()).single()
    if (!club) {
      setError('Club code not recognised. Check with your Team Manager or Club.')
      setBusy(false)
      return
    }

    const { data: auth, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError || !auth.user) {
      setError(authError?.message || 'Could not create account.')
      setBusy(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: auth.user.id,
      team_name: teamName.trim(),
      club_id: club.id,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    })
    if (profileError) {
      setError('Account created but profile failed: ' + profileError.message)
      setBusy(false)
      return
    }

   await fetch('/api/deal-t1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grades }) })
    window.location.href = '/team'
  }

  const field = "w-full rounded-lg px-4 py-3.5 text-sm text-[#F5F1E8] outline-none focus:border-[#3FBF63]"
  const fieldStyle = { background: '#181510', border: '1px solid #ffffff15' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="relative flex-1 px-6 overflow-hidden" style={{ paddingTop: "140px", paddingBottom: "100px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10" style={{ maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>Register</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
              Claim your team.
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <input className={field} style={fieldStyle} type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} />
            <input className={field} style={fieldStyle} type="password" placeholder="Password *" value={password} onChange={e => setPassword(e.target.value)} />
            <input className={field} style={fieldStyle} type="text" placeholder="Team name *" value={teamName} onChange={e => setTeamName(e.target.value)} />
            <input className={field} style={fieldStyle} type="text" placeholder="Club code *" value={clubCode} onChange={e => setClubCode(e.target.value)} />
            <input className={field} style={fieldStyle} type="text" placeholder="Your name (optional)" value={fullName} onChange={e => setFullName(e.target.value)} />
            <input className={field} style={fieldStyle} type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
<div className="flex gap-3">
              {(['mens','womens'] as const).map(g => (
                <button key={g} type="button"
                  onClick={() => setGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                  className="flex-1 rounded-lg px-4 py-3.5 text-sm font-bold transition-all"
                  style={grades.includes(g)
                    ? { color: '#141210', background: g === 'mens' ? '#3FBF63' : '#4D7FFF' }
                    : { color: '#F5F1E860', background: '#181510', border: '1px solid #ffffff15' }}>
                  {g === 'mens' ? "Men's League" : "Women's League"}
                </button>
              ))}
            </div>
            {error && <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>}

            <button onClick={handleRegister} disabled={busy}
              className="mt-2 text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ color: '#39FF6A', border: '1px solid #39FF6A', background: 'transparent', padding: "18px 0", textShadow: '0 0 12px #39FF6A80', boxShadow: '0 0 16px #39FF6A30, inset 0 0 16px #39FF6A15' }}>
              {busy ? 'Creating your team…' : 'Register'}
            </button>

            <p className="text-xs text-[#F5F1E8]/40 text-center mt-4">
              Already registered? <a href="/login" className="underline" style={{ color: '#3FBF63' }}>Log in</a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
