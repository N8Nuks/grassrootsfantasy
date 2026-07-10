'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin() {
    setError('')
    setBusy(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setBusy(false)
      return
    }
    window.location.href = '/team'
  }

  const field = "w-full rounded-lg px-4 py-3.5 text-sm text-[#F5F1E8] outline-none focus:border-[#3FBF63]"
  const fieldStyle = { background: '#181510', border: '1px solid #ffffff15' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="relative flex-1 px-6 overflow-hidden" style={{ paddingTop: "160px", paddingBottom: "120px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10" style={{ maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>Log in</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
              Back to your team.
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <input className={field} style={fieldStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className={field} style={fieldStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />

            {error && <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>}

            <button onClick={handleLogin} disabled={busy}
              className="mt-2 text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ color: '#39FF6A', border: '1px solid #39FF6A', background: 'transparent', padding: "18px 0", textShadow: '0 0 12px #39FF6A80', boxShadow: '0 0 16px #39FF6A30, inset 0 0 16px #39FF6A15' }}>
              {busy ? 'Logging in…' : 'Log in'}
            </button>

            <p className="text-xs text-[#F5F1E8]/40 text-center mt-4">
              New here? <a href="/register" className="underline" style={{ color: '#3FBF63' }}>Register your team</a>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
