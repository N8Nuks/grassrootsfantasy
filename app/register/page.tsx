'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'
import PackReveal, { RevealCard } from '@/components/PackReveal'
import SandboxBanner from '@/components/SandboxBanner'

type PackQueueItem = { grade: 'mens' | 'womens'; cards: RevealCard[]; packName?: string }

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [clubCode, setClubCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [grades, setGrades] = useState<('mens'|'womens')[]>(['womens', 'mens'])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [packQueue, setPackQueue] = useState<PackQueueItem[]>([])
  const [cardStyle, setCardStyle] = useState<'standard' | 'premium'>('standard')

  // Already signed in (e.g. refreshed mid-reveal)? Go to the team — cards are safe.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.href = '/team'
    })
    // Card style follows the site setting so reveals match the rest of the app
    supabase.from('site_settings').select('value').eq('key', 'card_style').maybeSingle()
      .then(({ data }) => {
        if (data?.value === 'premium' || data?.value === 'standard') setCardStyle(data.value)
      })
  }, [])

  function toggleGrade(g: 'mens' | 'womens') {
    setGrades(prev => {
      if (prev.includes(g)) {
        if (prev.length === 1) return prev // always at least one grade selected
        return prev.filter(x => x !== g)
      }
      return [...prev, g]
    })
  }

  async function handleRegister() {
    setError('')
    if (!email || !password || !teamName || !clubCode) {
      setError('Email, password, team name, and club code are required.')
      return
    }
    setBusy(true)
    const supabase = createClient()

    // Team names are unique, case-insensitively — checked here so the user gets a
    // clear message, and enforced by a database constraint so two people submitting
    // the same name at the same moment can't both get through.
    const wanted = teamName.trim()
    const nameCheck = await fetch('/api/check-team-name', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wanted }),
    })
    const nameData = await nameCheck.json().catch(() => null)
    if (nameData && nameData.available === false) {
      setError(`"${wanted}" is already taken. Choose a different team name.`)
      setBusy(false)
      return
    }

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
      // The unique constraint fires if someone claimed the name in the seconds
      // between the check above and this insert.
      const clash = profileError.code === '23505'
        || /duplicate key|team_name/i.test(profileError.message)
      setError(clash
        ? `"${wanted}" is already taken. Choose a different team name and press Register again.`
        : 'Something went wrong setting up your team. Try again, or email info@grassrootsfantasy.co.nz.')
      setBusy(false)
      return
    }

    const dealRes = await fetch('/api/deal-t1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grades }) })
    const dealData = await dealRes.json().catch(() => null)

    const queue: PackQueueItem[] = []
    if (dealRes.ok && dealData?.packs?.length) {
      const orderedPacks = [...(dealData.packs as PackQueueItem[])].sort((a, b) =>
        (a.grade === 'womens' ? 0 : 1) - (b.grade === 'womens' ? 0 : 1))
      for (const p of orderedPacks) {
        queue.push({ ...p, packName: 'Starter Pack' })
      }
    }

    // In-season registrants: Pre-Season Pack deals immediately after (release-gated)
    for (const grade of grades) {
      const t2 = await fetch('/api/deal-t2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grade }) })
      const t2Data = await t2.json().catch(() => null)
      if (t2.ok && t2Data?.cards?.length) {
        queue.push({ grade, cards: t2Data.cards, packName: 'Pre-Season Pack' })
      }
    }

    if (queue.length) {
      setPackQueue(queue)
      setBusy(false)
      return
    }

    // Fallback: deal happened but no card payload — go straight to the team
    window.location.href = '/team'
  }

  function onPackDone() {
    setPackQueue(prev => {
      if (prev.length <= 1) {
        window.location.href = '/team'
        return prev
      }
      return prev.slice(1)
    })
  }

  const field = "w-full rounded-lg px-4 py-3.5 text-sm text-[#F5F1E8] outline-none transition-shadow focus:border-[#3FBF63] focus:shadow-[0_0_14px_#3FBF6340]"
  const fieldStyle = { background: '#181510', border: '1px solid #ffffff15' }
  const label = "block text-xs font-bold uppercase tracking-wider text-[#F5F1E8]/50 mb-1.5"

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav /><SandboxBanner />
      <section className="relative flex-1 px-6 overflow-hidden" style={{ paddingTop: "56px", paddingBottom: "80px" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
        <div className="relative z-10" style={{ maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
          <div className="text-center mb-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>Register</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)' }}>
              Claim your team.
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className={label}>Email *</label>
              <input className={field} style={fieldStyle} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={label}>Password *</label>
              <input className={field} style={fieldStyle} type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className={label}>Team name *</label>
              <input className={field} style={fieldStyle} type="text" autoComplete="off" placeholder="The name on the ladder" value={teamName} onChange={e => setTeamName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Club code *</label>
              <input className={field} style={fieldStyle} type="text" autoComplete="off" placeholder="From your Team Manager or Club" value={clubCode} onChange={e => setClubCode(e.target.value)} />
              <p className="text-[11px] text-[#F5F1E8]/50 mt-1.5">
                No club code? Use <b style={{ color: '#E8C15A' }}>GFNFS26</b> to join as a general supporter.
              </p>
            </div>
            <div>
              <label className={label}>Your name (optional)</label>
              <input className={field} style={fieldStyle} type="text" autoComplete="name" placeholder="First and last" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Phone (optional)</label>
              <input className={field} style={fieldStyle} type="tel" autoComplete="tel" inputMode="tel" placeholder="For prize contact only" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div>
              <label className={label}>Leagues — you&apos;re in both unless you opt out</label>
              <div className="flex gap-3">
                {(['womens','mens'] as const).map(g => (
                  <button key={g} type="button"
                    onClick={() => toggleGrade(g)}
                    className="flex-1 rounded-xl px-4 py-5 text-base font-black transition-all"
                    style={grades.includes(g)
                      ? { color: '#141210', background: g === 'mens' ? '#3FBF63' : '#4D7FFF', boxShadow: g === 'mens' ? '0 0 16px #3FBF6350' : '0 0 16px #4D7FFF50' }
                      : { color: '#F5F1E860', background: '#181510', border: '1px solid #ffffff15' }}>
                    {g === 'mens' ? "Men's League" : "Women's League"}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm" style={{ color: '#FF6B6B' }}>{error}</p>}

            <button onClick={handleRegister} disabled={busy}
              className="mt-2 text-base font-bold tracking-wide transition-all hover:scale-[1.02] disabled:opacity-50 rounded-full"
              style={{ color: '#39FF6A', border: '1px solid #39FF6A', background: 'transparent', padding: "18px 0", textShadow: '0 0 12px #39FF6A80', boxShadow: '0 0 16px #39FF6A30, inset 0 0 16px #39FF6A15' }}>
              {busy ? 'Creating your team…' : 'Register'}
            </button>

            <p className="text-xs text-[#F5F1E8]/60 text-center mt-4">
              Already registered? <a href="/login" className="underline" style={{ color: '#3FBF63' }}>Log in</a>
            </p>
          </div>
        </div>
      </section>

      {packQueue.length > 0 && (
        <PackReveal
          key={`${packQueue[0].grade}-${packQueue[0].packName ?? 'pack'}`}
          grade={packQueue[0].grade}
          packName={packQueue[0].packName ?? 'Starter Pack'}
          cards={packQueue[0].cards}
          cardStyle={cardStyle}
          onDone={onPackDone}
        />
      )}
      <Footer />
    </main>
  )
}