import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import GradeSwitch from '@/components/GradeSwitch'
import FactsTicker from '@/components/FactsTicker'
import { createClient } from '@/lib/supabase/server'
import { CAREER_RECORDS } from '@/lib/nfsRecords'
import { splitName } from '@/lib/names'

const COBALT = '#2456E6'
const GOLD = '#E8C15A'
const SILVER = '#C9CDD4'
const BRONZE = '#C97F3D'

/* Milestone scales, the same ones the scoring run records against. Games every
   50, hits and RBI every 100, home runs every 50, pitching strikeouts every 100
   from 200. A player shows here once they're within the window of the next one. */
/* Ranked on rounds, not raw difference. A player gets one game a round but can
   hit four home runs in an afternoon, so `rate` is what a productive player
   does in a round and decides how near a mark really is. */
const WATCH: { key: string; label: string; rate: number; marks: number[] }[] = [
  { key: 'career_games', label: 'Games', rate: 1, marks: range(50, 1000, 50) },
  { key: 'career_h', label: 'Hits', rate: 2, marks: range(100, 1000, 100) },
  { key: 'career_hr', label: 'Home runs', rate: 0.4, marks: range(50, 500, 50) },
  { key: 'career_rbi', label: 'RBI', rate: 1.5, marks: range(100, 1000, 100) },
  /* Strikeouts are recorded and celebrated once reached, but deliberately not
     watched — a public countdown puts a pitcher under pressure mid-game and
     could change how a team plays around them. */
]
const HORIZON = 6   // rounds — anything further out isn't a watch yet
function range(from: number, to: number, step: number) {
  const out: number[] = []
  for (let n = from; n <= to; n += step) out.push(n)
  return out
}

const name = (n: string) => (
  <>{splitName(n).first} <span className="uppercase">{splitName(n).last}</span></>
)

export default async function BookOfRecords({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: 'mens' | 'womens' = params.grade === 'womens' ? 'womens' : 'mens'
  const accent = grade === 'womens' ? COBALT : '#3FBF63'
  const supabase = await createClient()

  // Live from the roster, so the watch moves the moment a round is scored
  const { data: players } = await supabase
    .from('players').select('full_name, stats, career_games')
    .eq('grade', grade).eq('active', true)

  type Chase = { name: string; label: string; now: number; mark: number; needs: number; rounds: number }
  const chasing: Chase[] = []
  for (const p of players ?? []) {
    const stats = (p.stats ?? {}) as Record<string, number>
    for (const w of WATCH) {
      const now = Number(w.key === 'career_games' ? (p.career_games ?? 0) : (stats[w.key] ?? 0))
      if (!now) continue
      const mark = w.marks.find(m => m > now)
      if (mark == null) continue
      const needs = mark - now
      const rounds = needs / w.rate
      if (rounds <= HORIZON) chasing.push({ name: p.full_name, label: w.label, now, mark, needs, rounds })
    }
  }
  chasing.sort((a, b) => a.rounds - b.rounds || b.mark - a.mark)

  // Milestones already reached this season, newest first
  const { data: reached } = await supabase
    .from('milestones')
    .select('stat, milestone, round_number, players!inner(full_name, grade)')
    .eq('grade', grade).gt('round_number', 0)
    .order('round_number', { ascending: false }).limit(12)

  const STAT_LABEL: Record<string, string> = {
    games: 'Premier games', hits: 'career hits', hr: 'career home runs',
    rbi: 'career RBI', k_pit: 'career strikeouts',
  }
  const medal = (i: number) => (i === 0 ? GOLD : i === 1 ? SILVER : i === 2 ? BRONZE : '#ffffff35')

  /* Three heat bands: about to fall, close, still climbing. The bar underneath
     shows how far through the milestone they are, so 40 short of 1,000 reads
     differently from 40 short of 100. */
  const HOT = '#FF8C42'
  const heat = (rounds: number) =>
    rounds <= 1 ? { tone: HOT, tint: `${HOT}14`, bar: HOT }
      : rounds <= 3 ? { tone: GOLD, tint: `${GOLD}0C`, bar: GOLD }
        : { tone: accent, tint: 'transparent', bar: '#ffffff30' }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />
      <section className="flex-1 px-5 sm:px-8" style={{ paddingTop: '80px', paddingBottom: '90px' }}>
        <div style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}>

          <div className="text-center" style={{ marginBottom: '36px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: accent, marginBottom: '12px' }}>
              NFS Premier League
            </p>
            <h1 className="text-3xl sm:text-5xl font-black text-[#F5F1E8]" style={{ fontFamily: 'var(--font-heading)', marginBottom: '14px' }}>
              The Book of Records
            </h1>
            <p className="text-sm text-[#F5F1E8]/55" style={{ maxWidth: '560px', margin: '0 auto 22px' }}>
              Every career mark set in the Premier competition since 2004, and who&apos;s closing in.
            </p>
            <div className="flex justify-center">
              <GradeSwitch grade={grade} mensHref="/nfs/records?grade=mens" womensHref="/nfs/records?grade=womens" />
            </div>
          </div>

          {/* ── Milestone watch ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${accent}35`, marginBottom: '34px' }}>
            <div className="text-center" style={{ background: `linear-gradient(180deg, ${accent}18 0%, transparent 100%)`, borderBottom: '1px solid #ffffff0a', padding: '22px 22px 18px' }}>
              <p className="text-xl sm:text-2xl font-black uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-heading)', color: accent }}>Milestone Watch</p>
              <p className="text-[11px] text-[#F5F1E8]/45" style={{ marginTop: '6px' }}>
                Ranked by how near they really are — one game a round, but four hits in an afternoon. <span style={{ color: '#FF8C42' }}>Orange</span> could fall this round.
              </p>
            </div>
            {chasing.length === 0 ? (
              <p className="text-sm text-center text-[#F5F1E8]/50" style={{ padding: '28px 22px' }}>
                Nobody within reach of a milestone right now.
              </p>
            ) : (
              chasing.slice(0, 14).map((c, i) => (
                (() => {
                  const h = heat(c.rounds)
                  const pct = Math.max(4, Math.min(100, (c.now / c.mark) * 100))
                  return (
                    <div key={i} className="flex items-center gap-3"
                      style={{
                        borderBottom: '1px solid #ffffff08', padding: '12px 22px',
                        background: h.tint,
                        boxShadow: c.rounds <= 3 ? `inset 3px 0 0 ${h.tone}` : undefined,
                      }}>
                      <span className="w-12 shrink-0 text-center">
                        <span className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: h.tone }}>{c.needs}</span>
                        <span className="block text-[8px] font-black uppercase tracking-widest text-[#F5F1E8]/35">to go</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-[#F5F1E8] truncate">{name(c.name)}</span>
                        <span className="block text-[11px] text-[#F5F1E8]/45" style={{ marginBottom: '5px' }}>{c.now} {c.label.toLowerCase()}</span>
                        <span className="block rounded-full" style={{ height: '3px', background: '#ffffff12' }}>
                          <span className="block rounded-full" style={{ height: '3px', width: `${pct}%`, background: h.bar }} />
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="text-sm font-black" style={{ color: '#F5F1E8' }}>{c.mark}</span>
                        <span className="block text-[9px] font-black uppercase tracking-widest text-[#F5F1E8]/35">{c.label}</span>
                      </span>
                    </div>
                  )
                })()
              ))
            )}
          </div>

          {/* ── Reached this season ── */}
          {reached && reached.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: `1px solid ${GOLD}35`, marginBottom: '34px' }}>
              <div className="text-center" style={{ background: `linear-gradient(180deg, ${GOLD}18 0%, transparent 100%)`, borderBottom: '1px solid #ffffff0a', padding: '22px 22px 18px' }}>
                <p className="text-xl sm:text-2xl font-black uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-heading)', color: GOLD }}>Reached This Season</p>
              </div>
              {(reached as unknown as { stat: string; milestone: number; round_number: number; players: { full_name: string } }[]).map((r, i) => (
                <div key={i} className="flex items-center gap-3" style={{ borderBottom: '1px solid #ffffff08', padding: '12px 22px' }}>
                  <span className="w-14 shrink-0 text-[10px] font-black uppercase tracking-widest text-[#F5F1E8]/40">Rd {r.round_number}</span>
                  <span className="flex-1 min-w-0 text-sm font-bold text-[#F5F1E8] truncate">{name(r.players.full_name)}</span>
                  <span className="shrink-0 text-sm font-black" style={{ color: GOLD }}>
                    {r.milestone} <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5F1E8]/45">{STAT_LABEL[r.stat] ?? r.stat}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Career records ── */}
          <p className="text-xl sm:text-2xl font-black uppercase tracking-[0.18em] text-center" style={{ fontFamily: 'var(--font-heading)', color: accent, marginBottom: '22px' }}>
            Career Records · 2004–26
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAREER_RECORDS[grade].map(set => (
              <div key={set.key} className="rounded-2xl overflow-hidden" style={{ background: '#121215', border: '1px solid #ffffff12' }}>
                <div style={{ borderBottom: '1px solid #ffffff0a', padding: '12px 18px' }}>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#F5F1E8]">{set.label}</p>
                  {set.note && <p className="text-[9px] text-[#F5F1E8]/35" style={{ marginTop: '2px' }}>{set.note}</p>}
                </div>
                {set.rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ borderBottom: '1px solid #ffffff06', padding: '9px 18px' }}>
                    <span className="w-4 shrink-0 text-[11px] font-black" style={{ color: medal(i) }}>{i + 1}</span>
                    <span className="flex-1 min-w-0 text-[13px] font-bold text-[#F5F1E8]/85 truncate">{name(r.name)}</span>
                    <span className="shrink-0 text-sm font-black" style={{ fontFamily: 'var(--font-heading)', color: i === 0 ? GOLD : '#F5F1E8' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-center text-[#F5F1E8]/40" style={{ marginTop: '26px' }}>
            Career totals from the NFS lifetime stats, 2004–26. Single-season records arrive once the season-by-season splits are in.
          </p>

          <div style={{ marginTop: '40px' }}>
            <FactsTicker compact />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}