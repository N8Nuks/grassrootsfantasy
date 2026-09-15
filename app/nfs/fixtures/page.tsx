import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ClubAvatar from '@/components/ClubAvatar'
import { createClient } from '@/lib/supabase/server'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#7FC4FF'

type Fixture = {
  id: string
  grade: 'mens' | 'womens'
  round_number: number
  played_on: string
  start_time: string | null
  team_a: string
  team_b: string
  club_a: string | null
  club_b: string | null
  location: string | null
  venue: string | null
  section: string | null
}
type Round = { round_number: number; lock_at: string | null; status: string }

/* Who hosts at each ground. Matched on a keyword in the location name so
   "Simson Reserve" and "Simson Reserve D1" both resolve. */
const HOSTS: { match: string; club: string; label: string }[] = [
  { match: 'simson',        club: 'Marist',    label: 'Marist' },
  { match: 'fowlds',        club: 'United',    label: 'Auckland United' },
  { match: 'warren freer',  club: 'Ramblers',  label: 'Mt Albert Ramblers' },
  { match: 'prince edward', club: 'Patriots',  label: 'Papakura Patriots' },
  { match: 'mana',          club: 'Patriots',  label: 'Papakura Patriots' },
  { match: 'starling',      club: 'Waitakere', label: 'Waitākere Bears' },
  { match: 'rosedale',      club: 'NHSA',      label: 'North Harbour Softball' },
  { match: 'sturges',       club: 'Otahuhu',   label: 'Ōtāhuhu' },
  { match: 'meadowlands',   club: 'Howick',    label: 'Howick' },
  { match: 'colin law',     club: 'Pukekohe',  label: 'Pukekohe' },
]
const hostOf = (location: string | null) => {
  const l = (location ?? '').toLowerCase()
  return HOSTS.find(h => l.includes(h.match)) ?? null
}

const DAY = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Pacific/Auckland' })
const LOCK = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Pacific/Auckland' })

const fmtDate = (iso: string) => DAY.format(new Date(iso + 'T12:00:00+12:00'))
const fmtTime = (t: string | null) => {
  if (!t || t === '23:59') return null
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`
}

// Placeholder teams (A1–A7) are playoff seeds not yet drawn; BYE is a bye.
const isPlaceholder = (t: string) => /^[A-Z]\d$/.test(t)
const label = (team: string, club: string | null) =>
  team === 'BYE' ? 'Bye' : isPlaceholder(team) ? `Seed ${team.slice(1)}` : (club ?? team)

export default async function Fixtures({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const sp = await searchParams
  const grade: 'mens' | 'womens' = sp.grade === 'womens' ? 'womens' : 'mens'
  const accent = grade === 'mens' ? GOLD : SILVER

  const supabase = await createClient()
  const [{ data: fixtures, error: fxError }, { data: rounds }] = await Promise.all([
    supabase.from('fixtures')
      .select('id, grade, round_number, played_on, start_time, team_a, team_b, club_a, club_b, location, venue, section')
      .eq('grade', grade)
      .order('round_number').order('played_on').order('start_time'),
    supabase.from('rounds').select('round_number, lock_at, status').eq('grade', grade),
  ])

  const lockOf = new Map(((rounds ?? []) as Round[]).map(r => [r.round_number, r]))
  const byRound = new Map<number, Fixture[]>()
  for (const f of (fixtures ?? []) as Fixture[]) {
    byRound.set(f.round_number, [...(byRound.get(f.round_number) ?? []), f])
  }
  const roundNumbers = [...byRound.keys()].sort((a, b) => a - b)

  const seg = (active: boolean) => ({
    color: active ? '#0D0D0F' : '#F5F1E8',
    background: active ? accent : 'transparent',
    padding: '14px 32px',
    textShadow: active ? 'none' : '0 1px 3px #000000',
  })

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />

      {/* Hero — the grade's Classic banner behind it */}
      <section className="relative px-6 sm:px-12 overflow-hidden" style={{ paddingTop: '70px', paddingBottom: '44px' }}>
        <div className="absolute inset-0" style={{
          background: `linear-gradient(180deg, #0D0D0FB0 0%, #0D0D0F80 50%, #0D0D0FE6 100%), url(/banner-classic-${grade}.webp) center / cover no-repeat`,
        }} />
        <div className="relative z-10 text-center" style={{ maxWidth: '740px', marginLeft: 'auto', marginRight: 'auto' }}>
          <a href="/nfs" className="inline-block text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: SILVER, textShadow: '0 1px 3px #000000', marginBottom: '18px' }}>
            ← Back to the NFSPL
          </a>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: GOLD, textShadow: '0 1px 3px #000000' }}>2026/27 Season</p>
          <div style={{ background: COBALT, height: '1px', width: '96px', margin: '0 auto 24px' }} />
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-6" style={{ fontFamily: 'var(--font-heading)', textShadow: '0 2px 8px #000000' }}>
            Fixtures
          </h1>
          <p className="text-sm text-white/85 leading-relaxed" style={{ maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '28px', textShadow: '0 1px 3px #000000' }}>
            Every round of the NFS Premier League. Lineups lock before the first game of each round —
            the lock time is shown where it&apos;s set.
          </p>
          <div className="inline-flex rounded-full overflow-hidden" style={{ border: '1px solid #ffffff40', background: '#0D0D0FCC' }}>
            <a href="/nfs/fixtures?grade=mens" className="text-xs font-black uppercase tracking-widest" style={seg(grade === 'mens')}>Men&apos;s</a>
            <a href="/nfs/fixtures?grade=womens" className="text-xs font-black uppercase tracking-widest" style={{ ...seg(grade === 'womens'), borderLeft: '1px solid #ffffff20' }}>Women&apos;s</a>
          </div>
        </div>
      </section>

      {/* Rounds */}
      <section className="px-6 sm:px-12" style={{ background: '#14141A', borderTop: '1px solid #ffffff0a', paddingTop: '36px', paddingBottom: '48px' }}>
        <div style={{ maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
          {roundNumbers.length === 0 && (
            <p className="text-sm text-center text-white/55">No fixtures loaded for this grade yet.{fxError ? ` (${fxError.message})` : ''}</p>
          )}
          {roundNumbers.map(n => {
            const games = byRound.get(n)!
            const dates = [...new Set(games.map(g => g.played_on))]
            const lock = lockOf.get(n)
            // Host = the ground with the most games this round
            const tally = new Map<string, number>()
            for (const g of games) if (g.location) tally.set(g.location, (tally.get(g.location) ?? 0) + 1)
            const mainGround = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
            const host = hostOf(mainGround)
            return (
              <div key={n} className="rounded-xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}30`, marginBottom: '20px' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap"
                  style={{ padding: '12px 20px', borderBottom: '1px solid #ffffff0a', background: `linear-gradient(90deg, ${accent}14 0%, transparent 60%)` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {host && (
                      host.club === 'NHSA'
                        ? <ClubAvatar club="Generic" frame="diamond" size={36} />
                        : <ClubAvatar club={host.club} frame="gold" size={36} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                        Round {n} <span className="text-white/45">· {dates.map(fmtDate).join(' · ')}</span>
                      </p>
                      {host && (
                        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent, marginTop: '2px' }}>
                          Hosted by {host.label}
                        </p>
                      )}
                    </div>
                  </div>
                  {lock?.lock_at && (
                    <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: accent }}>
                      Lineups lock {LOCK.format(new Date(lock.lock_at))}
                    </span>
                  )}
                </div>
                {games.map(g => {
                  const bye = g.team_a === 'BYE' || g.team_b === 'BYE'
                  const time = fmtTime(g.start_time)
                  const where = [g.location, g.venue].filter(v => v && v !== 'Unallocated').join(' · ')
                  return (
                    <div key={g.id} className="flex items-center gap-4"
                      style={{ borderBottom: '1px solid #ffffff06', padding: '12px 20px', opacity: bye ? 0.55 : 1 }}>
                      <span className="w-16 shrink-0 text-[11px] font-black" style={{ color: accent }}>
                        {dates.length > 1 ? fmtDate(g.played_on).split(' ')[0] + ' ' : ''}{time ?? (bye ? '' : 'TBC')}
                      </span>
                      <span className="flex-1 min-w-0 text-sm font-bold text-white/90">
                        {label(g.team_a, g.club_a)} <span className="text-white/35">v</span> {label(g.team_b, g.club_b)}
                        {g.section && g.section !== 'Section A' && (
                          <span className="text-[9px] uppercase tracking-widest ml-2" style={{ color: '#ffffff40' }}>{g.section}</span>
                        )}
                      </span>
                      <span className="hidden sm:block shrink-0 text-[11px] text-white/45 text-right">{where}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
          <p className="text-[11px] text-center text-white/40" style={{ marginTop: '8px' }}>
            Seeds are playoff places not yet decided. Fixtures are as published by Auckland Softball and may change.
          </p>
        </div>
      </section>

      {/* CTA back */}
      <section className="px-6 sm:px-12 text-center" style={{ background: '#0D0D0F', borderTop: `1px solid ${COBALT}40`, paddingTop: '44px', paddingBottom: '52px' }}>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/team" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: '#0D0D0F', background: GOLD, padding: '16px 34px', boxShadow: `0 0 22px ${GOLD}40` }}>
            Set your lineup
          </a>
          <a href="/nfs" className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.03]"
            style={{ color: 'white', border: '1px solid #ffffff35', padding: '16px 34px' }}>
            Back to the NFSPL
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}