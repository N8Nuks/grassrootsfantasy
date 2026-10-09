import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ClubAvatar from '@/components/ClubAvatar'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { POOL_FILTER } from '@/lib/pool'
import { nzToDate } from '@/lib/coach'

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
  score_a: number | null
  score_b: number | null
}
type Round = { id: string; round_number: number; lock_at: string | null; status: string }
type StatRow = { player_id: string; round_id: string; raw: Record<string, unknown> | null }
type PlayerRow = {
  id: string; full_name: string; playing_number: number | string | null
  reveal_pos: string | null; club_id: string | null; career_games: number | null
}
type ClubRow = { id: string; name: string }
type LineupRow = { round_number: number; player_id: string | null; club_id: string | null; bat_order: number | null; pos: string }
type Proj = { id: string; name: string; slot: string; tag: string | null; strong: boolean; ord: number }
/* named  = the club's own team for the coming round
   lineup = its team from the last round on file
   played = no team on file, so everyone who took the field last round */
type ClubProj = { kind: 'named' | 'lineup' | 'played'; round: number; list: Proj[] }

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

/* Projected lineups: helpers. */
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
const tookField = (raw: Record<string, unknown> | null) =>
  raw == null ? false : (raw.gp == null || raw.gp === '' ? true : num(raw.gp) > 0)
const clubKey = (s: string | null) => (s ?? '').trim().toLowerCase()
const surname = (n: string) => (n.trim().split(/\s+/).slice(-1)[0] ?? '').toLowerCase()
const caption = (cp: ClubProj) =>
  cp.kind === 'named' ? `Named for Round ${cp.round}`
    : cp.kind === 'lineup' ? `Round ${cp.round} starting lineup`
      : `Played Round ${cp.round}`

export default async function Fixtures({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const sp = await searchParams
  const grade: 'mens' | 'womens' = sp.grade === 'womens' ? 'womens' : 'mens'
  const accent = grade === 'mens' ? GOLD : SILVER

  const supabase = await createClient()
  const [{ data: fixtures, error: fxError }, { data: rounds }] = await Promise.all([
    supabase.from('fixtures')
      .select('id, grade, round_number, played_on, start_time, team_a, team_b, club_a, club_b, location, venue, section, score_a, score_b')
      .eq('grade', grade)
      .order('round_number').order('played_on').order('start_time'),
    supabase.from('rounds').select('id, round_number, lock_at, status').eq('grade', grade),
  ])

  const roundList = (rounds ?? []) as Round[]
  const lockOf = new Map(roundList.map(r => [r.round_number, r]))
  const numberOf = new Map(roundList.map(r => [r.id, r.round_number]))
  const byRound = new Map<number, Fixture[]>()
  for (const f of (fixtures ?? []) as Fixture[]) {
    byRound.set(f.round_number, [...(byRound.get(f.round_number) ?? []), f])
  }
  const roundNumbers = [...byRound.keys()].sort((a, b) => a - b)

  /* Projected lineups, shown on the next round to be played. Each club's team
     is whatever its coach named (club_lineups), at the latest round on file.
     The coach names the real team; GF decides what shows:
       - players who are inactive, under 18 without consent, or not in GF are
         left out
       - if that leaves fewer than nine batters, each gap is filled with that
         club's best eligible player who isn't already in the lineup: most
         points in the last scored round, then most career games, and not
         anyone a coach has flagged unavailable. A fill-in takes the hidden
         player's batting slot.
     A club with no team on file falls back to who played last round. */
  let projRound: number | null = null
  const projOf = new Map<string, ClubProj>()
  const roundIds = roundList.filter(r => r.round_number > 0).map(r => r.id)
  if (roundIds.length > 0) {
    const { data: statRows } = await supabase.from('player_stats')
      .select('player_id, round_id, raw')
      .in('round_id', roundIds)
    const played = ((statRows ?? []) as StatRow[]).filter(s => tookField(s.raw))
    let lastScored: number | null = null
    for (const s of played) {
      const rn = numberOf.get(s.round_id)
      if (rn != null && (lastScored == null || rn > lastScored)) lastScored = rn
    }
    if (lastScored != null) {
      const scored: number = lastScored
      const next = roundNumbers.find(rn => rn > scored) ?? null
      projRound = next
      if (next != null) {
        const last = played.filter(s => numberOf.get(s.round_id) === scored)
        const lastIds = new Set(last.map(s => s.player_id))
        const pitched = new Set(last.filter(s => num(s.raw?.ip) > 0).map(s => s.player_id))
        const scoredRoundId = roundList.find(r => r.round_number === scored)?.id ?? null

        const [{ data: plRows }, { data: clubRows }, { data: luRows }] = await Promise.all([
          supabase.from('players')
            .select('id, full_name, playing_number, reveal_pos, club_id, career_games')
            .eq('grade', grade)
            .eq('active', true)
            .or(POOL_FILTER),
          supabase.from('clubs').select('id, name'),
          supabase.from('club_lineups')
            .select('round_number, player_id, club_id, bat_order, pos')
            .eq('grade', grade)
            .lte('round_number', next),
        ])
        const pointsOf = new Map<string, number>()
        if (scoredRoundId) {
          const { data: scRows } = await supabase.from('player_scores')
            .select('player_id, points').eq('round_id', scoredRoundId)
          for (const s of scRows ?? []) pointsOf.set(s.player_id as string, Number(s.points))
        }
        // Flags from coaches for the coming round; server-only table
        const { data: flagRows } = await createAdminClient().from('coach_unavailable')
          .select('player_id').eq('grade', grade).eq('round_number', next)
        const flagged = new Set((flagRows ?? []).map(f => f.player_id as string))

        const players = (plRows ?? []) as PlayerRow[]
        const clubName = new Map(((clubRows ?? []) as ClubRow[]).map(c => [c.id, c.name]))
        const byId = new Map(players.map(p => [p.id, p]))
        const poolByClub = new Map<string, PlayerRow[]>()
        for (const p of players) {
          if (!p.club_id) continue
          poolByClub.set(p.club_id, [...(poolByClub.get(p.club_id) ?? []), p])
        }

        // Fallback list: who took the field last round, pitchers first.
        const playedOf = new Map<string, Proj[]>()
        const sortedPlayed = players
          .filter(p => lastIds.has(p.id))
          .sort((a, b) => {
            const pa = pitched.has(a.id), pb = pitched.has(b.id)
            return pa !== pb ? (pa ? -1 : 1) : surname(a.full_name).localeCompare(surname(b.full_name))
          })
        for (const p of sortedPlayed) {
          const k = clubKey(p.club_id ? clubName.get(p.club_id) ?? null : null)
          if (!k) continue
          playedOf.set(k, [...(playedOf.get(k) ?? []), {
            id: p.id,
            name: p.full_name,
            slot: p.playing_number == null || p.playing_number === '' ? '' : String(p.playing_number),
            tag: pitched.has(p.id) ? 'P' : p.reveal_pos,
            strong: pitched.has(p.id),
            ord: 0,
          }])
        }

        // Named teams: group the coach's rows by club, latest round on file.
        const rowsOf = new Map<string, Map<number, LineupRow[]>>()
        for (const r of (luRows ?? []) as LineupRow[]) {
          if (!r.club_id) continue
          const byR = rowsOf.get(r.club_id) ?? new Map<number, LineupRow[]>()
          rowsOf.set(r.club_id, byR)
          byR.set(r.round_number, [...(byR.get(r.round_number) ?? []), r])
        }

        for (const [clubId, byR] of rowsOf) {
          const key = clubKey(clubName.get(clubId) ?? null)
          if (!key) continue
          const rn = [...byR.keys()].sort((a, b) => b - a)[0]
          const rows = byR.get(rn) ?? []

          // Who GF will show: in GF, active, and adult or consented
          const visible = rows.filter(r => r.player_id && byId.has(r.player_id))
          const visibleSet = new Set(visible)
          const hiddenPos = new Map<number, string>()
          for (const r of rows) if (!visibleSet.has(r) && r.bat_order != null) hiddenPos.set(r.bat_order, r.pos)

          const list: Proj[] = visible.map(r => {
            const p = byId.get(r.player_id as string) as PlayerRow
            return {
              id: p.id,
              name: p.full_name,
              slot: r.bat_order == null ? '' : r.bat_order === 10 ? 'FL' : String(r.bat_order),
              tag: r.pos,
              strong: r.pos === 'P',
              ord: r.bat_order ?? 99,
            }
          })

          // Fill each empty batting slot (1 to 9) so at least nine show
          const have = new Set(visible.filter(r => r.bat_order != null && r.bat_order <= 9).map(r => r.bat_order as number))
          const inLineup = new Set(rows.map(r => r.player_id).filter(Boolean) as string[])
          const candidates = (poolByClub.get(clubId) ?? [])
            .filter(p => !inLineup.has(p.id) && !flagged.has(p.id))
            .sort((a, b) => {
              const pa = pointsOf.get(a.id) ?? -1, pb = pointsOf.get(b.id) ?? -1
              if (pa !== pb) return pb - pa
              const ca = a.career_games ?? 0, cb = b.career_games ?? 0
              if (ca !== cb) return cb - ca
              return surname(a.full_name).localeCompare(surname(b.full_name))
            })
          let ci = 0
          for (let o = 1; o <= 9; o++) {
            if (have.has(o)) continue
            const cand = candidates[ci++]
            if (!cand) break
            const hp = hiddenPos.get(o)
            const tag = hp && hp !== 'P' && hp !== 'P2' ? hp : cand.reveal_pos
            list.push({ id: cand.id, name: cand.full_name, slot: String(o), tag, strong: false, ord: o })
          }

          list.sort((a, b) => a.ord - b.ord)
          projOf.set(key, { kind: rn === next ? 'named' : 'lineup', round: rn, list })
        }

        for (const [k, list] of playedOf) {
          if (!projOf.has(k)) projOf.set(k, { kind: 'played', round: scored, list })
        }
      }
    }
  }

  const lineupCol = (club: string, cp: ClubProj | undefined) => (
    <div className="min-w-0">
      <div style={{ paddingBottom: '6px', borderBottom: `1px solid ${accent}40` }}>
        <p className="text-[11px] font-black text-white/90">{club}</p>
        {cp && cp.list.length > 0 && (
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/45" style={{ marginTop: '2px' }}>{caption(cp)}</p>
        )}
      </div>
      {(!cp || cp.list.length === 0) && (
        <p className="text-[11px] text-white/40" style={{ paddingTop: '6px' }}>No lineup yet</p>
      )}
      {cp?.list.map(p => (
        <div key={p.id} className="flex items-center gap-2" style={{ padding: '5px 0', borderBottom: '1px solid #ffffff08' }}>
          <span className="w-5 shrink-0 text-[10px] font-black"
            style={{ color: cp.kind === 'played' ? '#ffffff66' : accent }}>{p.slot}</span>
          <span className="flex-1 min-w-0 truncate text-xs text-white/85">{p.name}</span>
          {p.tag && (p.strong
            ? <span className="text-[9px] font-black rounded" style={{ color: '#0D0D0F', background: accent, padding: '1px 6px' }}>{p.tag}</span>
            : <span className="text-[9px] font-black uppercase text-white/45">{p.tag}</span>)}
        </div>
      ))}
    </div>
  )

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
            /* A round can run across more than one park. Each ground's club is
               named in the header, and the games group under their ground. */
            const grounds: string[] = []
            for (const g of games) {
              if (g.location && g.location !== 'Unallocated' && !grounds.includes(g.location)) grounds.push(g.location)
            }
            const split = grounds.length > 1
            const hostLabels = grounds.map(gr => hostOf(gr)?.label).filter(Boolean) as string[]
            const hostAvatars = grounds.map(gr => hostOf(gr)).filter(Boolean) as NonNullable<ReturnType<typeof hostOf>>[]
            const byes = games.filter(g => !g.location || g.location === 'Unallocated')

            /* Park and diamond sit under the matchup so they're readable on a
               phone — the old right-hand column was hidden below sm. When the
               games are already grouped by park, the line shows the diamond.
               On the next round to be played, each game also carries a
               closed-by-default Projected lineups panel. */
            const gameRow = (g: Fixture, withGround: boolean) => {
              const bye = g.team_a === 'BYE' || g.team_b === 'BYE'
              const hasScore = g.score_a != null && g.score_b != null
              const aWon = hasScore && Number(g.score_a) > Number(g.score_b)
              const bWon = hasScore && Number(g.score_b) > Number(g.score_a)
              const time = fmtTime(g.start_time)
              const where = [withGround ? g.location : null, g.venue].filter(v => v && v !== 'Unallocated').join(' · ')
              const pa = projOf.get(clubKey(g.club_a))
              const pb = projOf.get(clubKey(g.club_b))
              const hasProj = n === projRound && !bye
                && !isPlaceholder(g.team_a) && !isPlaceholder(g.team_b)
                && ((pa?.list.length ?? 0) > 0 || (pb?.list.length ?? 0) > 0)
              const allNamed = pa?.kind === 'named' && pb?.kind === 'named'
              return (
                <div key={g.id} style={{ borderBottom: '1px solid #ffffff06', opacity: bye ? 0.55 : 1 }}>
                  <div className="flex items-start gap-4" style={{ padding: '12px 20px' }}>
                    <span className="w-16 shrink-0 text-[11px] font-black" style={{ color: accent, paddingTop: '2px' }}>
                      {dates.length > 1 ? fmtDate(g.played_on).split(' ')[0] + ' ' : ''}{time ?? (bye ? '' : 'TBC')}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white/90">
                        {hasScore ? (
                          <>
                            <span style={{ fontWeight: aWon ? 900 : 600, color: aWon ? '#ffffff' : '#ffffffA0' }}>{label(g.team_a, g.club_a)} {g.score_a}</span>
                            <span className="text-white/35"> – </span>
                            <span style={{ fontWeight: bWon ? 900 : 600, color: bWon ? '#ffffff' : '#ffffffA0' }}>{g.score_b} {label(g.team_b, g.club_b)}</span>
                          </>
                        ) : (
                          <>{label(g.team_a, g.club_a)} <span className="text-white/35">v</span> {label(g.team_b, g.club_b)}</>
                        )}
                        {g.section && g.section !== 'Section A' && (
                          <span className="text-[9px] uppercase tracking-widest ml-2" style={{ color: '#ffffff40' }}>{g.section}</span>
                        )}
                      </span>
                      {where && (
                        <span className="block text-[10px] text-white/45" style={{ marginTop: '3px' }}>{where}</span>
                      )}
                    </span>
                  </div>
                  {hasProj && (
                    <details style={{ padding: '0 20px 14px' }}>
                      <summary className="cursor-pointer select-none text-[10px] font-black uppercase tracking-[0.18em] [&::-webkit-details-marker]:hidden"
                        style={{ color: accent, marginLeft: '80px', listStyle: 'none' }}>
                        Projected lineups ▾
                      </summary>
                      <div className="grid grid-cols-2 gap-4" style={{ marginTop: '12px' }}>
                        {lineupCol(label(g.team_a, g.club_a), pa)}
                        {lineupCol(label(g.team_b, g.club_b), pb)}
                      </div>
                      <p className="text-[10px] text-white/45" style={{ marginTop: '10px' }}>
                        {allNamed
                          ? 'Teams as named by the clubs. Projected, not yet confirmed.'
                          : "Projected from each club's last lineup. Not confirmed by the clubs."}
                      </p>
                    </details>
                  )}
                </div>
              )
            }

            return (
              <div key={n} className="rounded-xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}30`, marginBottom: '20px' }}>
                <div className="flex items-center justify-between gap-4 flex-wrap"
                  style={{ padding: '12px 20px', borderBottom: '1px solid #ffffff0a', background: `linear-gradient(90deg, ${accent}14 0%, transparent 60%)` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {hostAvatars.slice(0, 3).map((h, i) => (
                      h.club === 'NHSA'
                        ? <ClubAvatar key={i} club="Generic" frame="diamond" size={36} />
                        : <ClubAvatar key={i} club={h.club} frame="gold" size={36} />
                    ))}
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                        Round {n} <span className="text-white/45">· {dates.map(fmtDate).join(' · ')}</span>
                      </p>
                      {hostLabels.length > 0 && (
                        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent, marginTop: '2px' }}>
                          Hosted by {hostLabels.length > 1
                            ? hostLabels.slice(0, -1).join(', ') + ' & ' + hostLabels[hostLabels.length - 1]
                            : hostLabels[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  {!lock && n === roundNumbers.find(rn => !lockOf.has(rn)) && (<span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: accent }}>Opens Tuesday 5pm</span>)}
                  {lock && (lock.status === 'provisional' || lock.status === 'confirmed') && (
                    <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: lock.status === 'confirmed' ? '#4ADE80' : accent }}>
                      {lock.status === 'confirmed' ? 'Confirmed' : 'Played'}
                    </span>
                  )}
                  {lock?.lock_at && lock.status !== 'provisional' && lock.status !== 'confirmed' && (
                    <span className="text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: new Date(lock.lock_at).getTime() < Date.now() ? '#B4BEC9' : accent }}>
                      {new Date(lock.lock_at).getTime() < Date.now() ? 'Locked' : <>Lineups lock {LOCK.format(
                        new Date(lock.lock_at).getTime() - Date.now() > 60 * 24 * 3600 * 1000
                          ? nzToDate(new Date(new Date(dates[0] + 'T12:00:00Z').getTime() - 86400000).toISOString().slice(0, 10), '23:00')
                          : new Date(lock.lock_at))}</>}
                    </span>
                  )}
                </div>

                {split ? (
                  <>
                    {grounds.map(gr => (
                      <div key={gr}>
                        <div className="flex items-center gap-2"
                          style={{ padding: '9px 20px', background: '#ffffff06', borderBottom: '1px solid #ffffff0a' }}>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{gr}</span>
                          {hostOf(gr)?.label && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                              · {hostOf(gr)!.label}
                            </span>
                          )}
                        </div>
                        {games.filter(g => g.location === gr).map(g => gameRow(g, false))}
                      </div>
                    ))}
                    {byes.map(g => gameRow(g, false))}
                  </>
                ) : (
                  games.map(g => gameRow(g, false))
                )}
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