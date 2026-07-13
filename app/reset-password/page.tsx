'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const GREEN = '#3FBF63'

export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // The recovery link signs the user in with a temporary session.
    // Wait for the session to exist before showing the form.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords don\'t match.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => router.push('/team'), 2500)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      <section className="relative flex-1 px-6 sm:px-12 overflow-hidden" style={{ paddingTop: "70px", paddingBottom: "70px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 55% at 50% 0%, #10214D 0%, #0D0D0F 70%)' }} />
        <div className="relative z-10" style={{ maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD }}>Account</p>
            <div className="mx-auto mb-6 h-px w-24" style={{ background: COBALT }} />
            <h1 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              Set a new password
            </h1>
          </div>

          {done ? (
            <div className="rounded-2xl px-8 py-8 text-center" style={{ background: '#121215', border: `1px solid ${GREEN}40` }}>
              <p className="text-sm font-bold leading-relaxed mb-2" style={{ color: GREEN }}>
                Password updated.
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                Taking you to your team…
              </p>
            </div>
          ) : !ready ? (
            <div className="rounded-2xl px-8 py-8 text-center" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <p className="text-sm text-white/70 leading-relaxed mb-2">
                Waiting for your reset link…
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                This page only works when opened from the link in your reset email. If you got here another way,{' '}
                <Link href="/forgot-password" className="underline hover:text-white transition-colors">request a reset link</Link>.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl px-8 py-8" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-2">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none mb-4"
                style={{ background: '#0D0D0F', border: '1px solid #ffffff1a' }}
              />
              <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-2">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                placeholder="Same again"
                className="w-full rounded-lg px-4 py-3 text-sm text-white outline-none mb-4"
                style={{ background: '#0D0D0F', border: '1px solid #ffffff1a' }}
              />
              {error && <p className="text-xs mb-4" style={{ color: '#FF6B6B' }}>{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full rounded-lg px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition-opacity disabled:opacity-50"
                style={{ background: COBALT }}
              >
                {loading ? 'Saving…' : 'Save new password'}
              </button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}