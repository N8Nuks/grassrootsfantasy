import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { theme, type Grade } from '@/lib/clubhouse'
import GradeSwitch from '@/components/GradeSwitch'
import PageGuide from '@/components/PageGuide'
import { managerAnalytics } from '@/lib/analytics'
import { splitName } from '@/lib/names'

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1))))
const caps = (n: string) => {
  const s = splitName(n)
  return s.last ? <>{s.first} <span className="uppercase">{s.last}</span></> : <>{s.first}</>
}

export default async function Analytics({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const params = await searchParams
  const grade: Grade = params.grade === 'womens' ? 'womens' : 'mens'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: prof }, { data: config }, { data: latestRound }] = await Promise.all([
    user ? supabase.from('profiles').select('team_name, site_theme').eq('id', user.id).single()
         : Promise.resolve({ data: null }),
    supabase.from('scoring_config').select('analytics_from_round').eq('grade', grade).single(),
    supabase.from('rounds').select('round_number')
      .eq('grade', grade).order('round_number', { ascending: false }).limit(1).maybeSingle(),
  ])
  const siteTheme = (prof as unknown as { site_theme?: string })?.site_theme ?? 'grade'
  const teamName = (prof as unknown as { team_name?: string })?.team_name ?? 'Your team'
  const T = theme(grade, siteTheme)
  const accentBright = T.electric ?? T.accent

  const gateRound = Number(config?.analytics_from_round ?? 0)
  const currentRound = latestRound?.round_number ?? 0
  const locked = currentRound < gateRound

  const a = user && !locked ? await managerAnalytics(supabase, user.id, grade) : null

  function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
    return (
      <div className="rounded-2xl" style={{ background: T.surface, border: '1px solid #ffffff12', padding: '20px 22px' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim }}>{label}</p>
        <p className="text-3xl font-black" style={{ fontFamily: 'var(--font-heading)', color: tone ?? accentBright, margin: '8px 0 6px' }}>{value}</p>
        <p className="text-[11px] leading-relaxed" style={{ color: T.textDim }}>{note}</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: T.field }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '820px', marginLeft: 'auto', marginRight: 'auto' }}>

          <a href={`/team?grade=${grade}`}
            className="inline-block text-[11px] font-bold uppercase tracking-widest transition-all hover:tracking-[0.2em]"
            style={{ color: T.textDim, marginBottom: '20px' }}>
            ← My Team
          </a>

          <div className="text-center" style={{ marginBottom: '40px' }}>
            <p className="text-xs font-black uppercase tracking-[0.3em] mb-3" style={{ color: T.accent }}>Manager Report</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: T.text }}>{teamName}</h1>
            <p className="text-sm mb-5" style={{ color: T.textDim }}>
              {a ? `${a.roundsScored} round${a.roundsScored === 1 ? '' : 's'} scored` : 'How you have used your squad'}
            </p>
            <div className="flex justify-center">
              <GradeSwitch grade={grade} mensHref="/analytics?grade=mens" womensHref="/analytics?grade=womens" palette={siteTheme !== 'grade' ? T : undefined} />
            </div>
          </div>

          {locked && (
            <div className="rounded-2xl text-center" style={{ background: T.surface, border: `1px solid ${T.accent}40`, padding: '48px 28px' }}>
              <p className="text-2xl font-black mb-3" style={{ fontFamily: 'var(--font-heading)', color: T.accent }}>
                Not enough season yet.
              </p>
              <p className="text-sm" style={{ color: T.textDim, maxWidth: '400px', margin: '0 auto' }}>
                Your manager report opens after Round {gateRound}. A handful of rounds is needed before
                the numbers say anything worth reading.
              </p>
            </div>
          )}

          {!locked && !a && (
            <div className="rounded-2xl text-center" style={{ background: T.surface, border: '1px solid #ffffff12', padding: '48px 28px' }}>
              <p className="text-2xl font-black mb-3" style={{ fontFamily: 'var(--font-heading)', color: T.accent }}>
                Nothing to report yet.
              </p>
              <p className="text-sm" style={{ color: T.textDim, maxWidth: '400px', margin: '0 auto' }}>
                Once a round is scored with your lineup in it, this page shows how much of your squad&apos;s
                output you actually captured — and where the rest went.
              </p>
            </div>
          )}

          {a && (
            <>
              {/* The headline */}
              <div className="rounded-2xl overflow-hidden pinstripe-fine text-center"
                style={{ background: `linear-gradient(180deg, ${T.surfaceRaised} 0%, ${T.surface} 100%)`, border: `3px solid ${T.button}`, marginBottom: '28px' }}>
                <div style={{ padding: '40px 28px 36px' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: T.accent, marginBottom: '14px' }}>Points captured</p>
                  <p className="text-6xl font-black leading-none" style={{ fontFamily: 'var(--font-heading)', color: accentBright, textShadow: T.glow }}>
                    {Math.round(a.capturedPct * 100)}%
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: T.textDim, maxWidth: '420px', margin: '18px auto 0' }}>
                    Your cards produced <b style={{ color: T.text }}>{fmt(a.squadRawTotal)}</b> points between them.
                    You banked <b style={{ color: T.text }}>{fmt(a.earnedTotal)}</b>. The gap is what your lineup choices cost you.
                  </p>
                </div>
              </div>

              {/* Where the rest went */}
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: T.textDim, marginBottom: '14px' }}>Where the rest went</p>
              <div className="grid gap-4 sm:grid-cols-3" style={{ marginBottom: '28px' }}>
                <Metric label="Left on the bench" value={fmt(a.benchLoss)} tone="#FF9B6B"
                  note="Shaved off by the 0.75× bench multiplier. Unavoidable in part — but a big number means your best cards were sitting down." />
                <Metric label="Lost to slot rules" value={fmt(a.slotLoss)} tone="#FF9B6B"
                  note="A P(B) who didn't pitch, a DR who didn't run. Points that existed on the sheet and never counted for you." />
                <Metric label="Stranded in reserves" value={fmt(a.reserveWaste)} tone="#FF9B6B"
                  note="Cards you owned that scored while parked at #17 or below. Every one of these was a selection you could have made." />
              </div>

              {/* What you got right */}
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: T.textDim, marginBottom: '14px' }}>What the armbands earned</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric label="Armband bonus" value={`+${fmt(a.armbandGain)}`}
                  note="Extra points from your Captain and Vice Captain across the season, over and above what those players would have scored unmarked." />
                {a.bestCall && (
                  <div className="rounded-2xl" style={{ background: T.surface, border: '1px solid #ffffff12', padding: '20px 22px' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim }}>Best call</p>
                    <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text, margin: '8px 0 2px' }}>
                      {caps(a.bestCall.name)}
                    </p>
                    <p className="text-2xl font-black" style={{ fontFamily: 'var(--font-heading)', color: accentBright, marginBottom: '6px' }}>
                      {fmt(a.bestCall.earned)}
                    </p>
                    <p className="text-[11px]" style={{ color: T.textDim }}>Your biggest single-round return, in Round {a.bestCall.round}.</p>
                  </div>
                )}
                {a.worstCall && (
                  <div className="rounded-2xl" style={{ background: T.surface, border: '1px solid #ffffff12', padding: '20px 22px' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: T.textDim }}>The one that got away</p>
                    <p className="text-lg font-black" style={{ fontFamily: 'var(--font-heading)', color: T.text, margin: '8px 0 2px' }}>
                      {caps(a.worstCall.name)}
                    </p>
                    <p className="text-2xl font-black" style={{ fontFamily: 'var(--font-heading)', color: '#FF9B6B', marginBottom: '6px' }}>
                      {fmt(a.worstCall.raw)}
                    </p>
                    <p className="text-[11px]" style={{ color: T.textDim }}>Scored in Round {a.worstCall.round} and earned you nothing.</p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-center" style={{ color: T.textDim, marginTop: '28px' }}>
                Every figure here is your own — the same player is worth a different amount to every manager,
                depending on where they sat and whether they wore an armband.
              </p>
            </>
          )}

          <div className="text-center" style={{ marginTop: '40px' }}>
            <a href={`/team?grade=${grade}`}
              className="inline-block text-sm font-black uppercase tracking-widest rounded-full transition-all hover:scale-[1.02]"
              style={{ color: T.buttonText, background: T.button, padding: '16px 40px', boxShadow: T.glow }}>
              Back to My Team
            </a>
          </div>
        </div>
      </section>
      <PageGuide pageKey="analytics" accent={T.accent} textColor={T.text} steps={[
        {
          title: 'Your manager report',
          body: "Everything here measures your decisions, not your players. Two managers holding the same card can bank wildly different points from it depending on where they played them.",
        },
        {
          title: 'Points captured',
          body: "The headline number: what your whole squad produced against what you actually banked. Nobody reaches 100% — five reserves can't score — but the gap tells you how much was within reach.",
        },
      ]} />
      <Footer />
    </main>
  )
}