'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'
import PackReveal, { RevealCard } from '@/components/PackReveal'
import SandboxBanner from '@/components/SandboxBanner'

type PackQueueItem = { grade: 'mens' | 'womens'; cards: RevealCard[]; packName?: string }
type Club = { id: string; code: string; name: string }

/* Closed between the sandbox ending and the real season loading. Set to false on
   18 September once the rosters are in and the packs are ready to deal. */
const REGISTRATION_CLOSED = true

/* The proxy already gates this page; this is the page's own closed state, which
   predates it. The same key lets an admin through to register during the
   changeover. Delete this block and set REGISTRATION_CLOSED to false on the 18th. */
const BYPASS = 'Fantasy1'

/* Everyone should land in their own club, so the picker lists the real clubs and
   the generic option sits behind a link. Nobody is locked out — it's one tap
   away — but the club path is the one in front of you. */
const GENERIC_CODE = 'GFNFS26'

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
  const [clubs, setClubs] = useState<Club[]>([])
  const [showGeneric, setShowGeneric] = useState(false)
  const [bypass, setBypass] = useState(false)

  useEffect(() => {
    setBypass(new URLSearchParams(window.location.search).get('admin') === BYPASS)
  }, [])

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
    /* Read from the table rather than hardcoding, so a club added or a code
       changed never leaves this list wrong. */
    supabase.from('clubs').select('id, code, name').order('name')
      .then(({ data }) => { if (data) setClubs(data as Club[]) })
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
      setError('Email, password, team name, and club are required.')
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

    /* The Pre-Season Pack is deliberately not dealt here. It waits on the team
       page, one per grade, so registration isn't four reveals deep and there's
       something to come back for. TeamClient already handles it — t2Available
       and openT2(). */

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

  // The real clubs, generic held back
  const realClubs = clubs.filter(c => c.code !== GENERIC_CODE)

  if (REGISTRATION_CLOSED && !bypass) {
    return (
      <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
        <Nav /><SandboxBanner />
        <section className="relative flex-1 px-6 overflow-hidden flex items-center" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #1A2E1F 0%, #141210 65%)' }} />
          <div className="relative z-10 text-center" style={{ maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#E8983A' }}>Closed for the changeover</p>
            <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)', marginBottom: '18px' }}>
              Back on 18 September.
            </h1>
            <p className="text-sm leading-relaxed text-[#F5F1E8]/60" style={{ marginBottom: '26px' }}>
              The sandbox season has closed and we&apos;re loading the real 2026/27
              rosters, with player photos and full career details. Registration reopens
              on <b style={{ color: '#F5F1E8' }}>18 September</b>, first round is
              {' '}<b style={{ color: '#F5F1E8' }}>26 September</b>, and the first scores
              lock in on <b style={{ color: '#F5F1E8' }}>29 September</b>.
            </p>
            <a href="/games"
              className="inline-block text-base font-bold tracking-wide transition-all hover:scale-[1.02] rounded-full"
              style={{ color: '#B47CFF', border: '1px solid #B47CFF', background: 'transparent', padding: '16px 40px', textShadow: '0 0 12px #B47CFF80', boxShadow: '0 0 16px #B47CFF30, inset 0 0 16px #B47CFF15' }}>
              Play the Arcade
            </a>
            <p className="text-xs text-[#F5F1E8]/50" style={{ marginTop: '22px' }}>
              Already registered? <a href="/login" className="underline" style={{ color: '#3FBF63' }}>Log in</a>
            </p>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

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
              <label className={label}>Your club *</label>
              <select className={field} style={fieldStyle}
                value={clubCode} onChange={e => setClubCode(e.target.value)}>
                <option value="">Choose your club</option>
                {realClubs.map(c => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
                {showGeneric && <option value={GENERIC_CODE}>General supporter</option>}
              </select>
              {!showGeneric ? (
                <p className="text-[11px] text-[#F5F1E8]/50 mt-1.5">
                  Not with a club?{' '}
                  <button type="button"
                    onClick={() => { setShowGeneric(true); setClubCode(GENERIC_CODE) }}
                    className="underline" style={{ color: '#E8C15A' }}>
                    Join as a general supporter
                  </button>
                </p>
              ) : (
                <p className="text-[11px] text-[#F5F1E8]/50 mt-1.5">
                  Playing for a club? Pick it above — you&apos;ll show on their board.
                </p>
              )}
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