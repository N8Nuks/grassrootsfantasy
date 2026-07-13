'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
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
              Reset your password
            </h1>
          </div>

          {sent ? (
            <div className="rounded-2xl px-8 py-8 text-center" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <p className="text-sm text-white/70 leading-relaxed mb-2">
                If an account exists for <span className="text-white font-bold">{email}</span>, a reset link is on its way.
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                Check your inbox (and spam folder). The link expires after one hour.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl px-8 py-8" style={{ background: '#121215', border: `1px solid ${COBALT}30` }}>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                Enter the email you registered with and we&apos;ll send you a link to set a new password.
              </p>
              <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                placeholder="you@example.com"
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-white/40 mt-6">
            <Link href="/login" className="hover:text-white transition-colors">Back to log in</Link>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}