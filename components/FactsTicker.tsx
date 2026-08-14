'use client'
import { useState, useEffect, useMemo } from 'react'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'
import { PLACINGS, HERITAGE_MEN, HERITAGE_WOMEN, SERIES_TEAMS, CAREER_MEN, CAREER_WOMEN } from '@/lib/nfsHistory'
import { MILESTONES, SHIELD_EVENTS, SHIELD_HOLDERS } from '@/lib/nfsMilestones'

// Announcements — every 4th ticker slot. Louder styling, current news.
const ANNOUNCEMENTS = [
  'Season One of the NFS Premier Fantasy League starts October 3.',
  'Sandbox season is running now — practice rounds, simulated stats, all teams reset in September.',
  "Sandbox rounds use last season's team lists — the real 2026/27 lists are patched in for the proper competition.",
  'The September patch brings real team lists, player photos, and full card details.',
  "One account plays both the Men's and Women's grades.",
  'Free to play.',
  'Endorsed by the Auckland Softball Association.',
  'Register and your 12-card Starter Pack lands instantly.',
  'Your Starter Pack is the only place two-way player cards are ever dealt.',
  'Your lineup auto-fills the moment you register — you can score from day one.',
  'A Pre-Season Pack takes your squad to 21 cards before Round 1.',
  "Register with your club's code.",
  'Lineups lock on Friday night, before the weekend games.',
  'Your new matchup appears the moment the round locks — until then you see how the last one finished.',
  'Round locked? Check Matchups. Your opponent and both lineups are revealed.',
  'Claim a free Weekly Pack every round.',
  'Results confirm Tuesday, when the new round opens.',
  'Provisional scores land over the weekend; official stats confirm them.',
  'Five ways to win: Season Ladder, Head-to-Head, Weekly High Score, Club Champion, Finals Challenge.',
  "Every point you score counts toward your Club's Champion campaign.",
  'One perfect weekend can top the Weekly High Score.',
  'Weekly High Scores have their own Top Score Champion.',
  'The Finals Challenge has its own packs, its own roster, its own champion.',
  'The season competition is for NFS round robin play only — the Finals has its own challenge.',
  'Anyone can beat anyone in Head-to-Head — form is temporary.',
  'Every point comes from a real event in a real game. Never fan voting.',
  'Tap any card, then tap again — the back shows every round they have played.',
  'Bench players score at 0.75× and step in at full value when a starter misses.',
  'The DR slot scores steals and caught stealing only. Pick your speed.',
  'Smart managers know: championships are won with great Commons.',
  'Real player photos and career badges arrive for the real season.',
  'The NFS has crowned Premier champions since 2005.',
  'Auckland softball has been played since 1939.',
  'Only eight players have reached 300 career games — their cards carry the badge.',
  'Every Premier award winner since 2004-05 is on the Honours Board.',
  'Over 1,500 moments of NFS history live in this ticker.',
  'Black Diamond Labs presents Grassroots Fantasy.',
  'Grassroots Fantasy and the GF NFS Premier League are brought to you by Black Diamond Labs.',
  'Players are selected randomly for you in Starter and Pre-Season Packs.',
  'Tuesday: check scores and matchup results. Wed–Fri: confirm your team. Sat–Mon: teams locked, game on.',
  'Scores are recorded from players — do you know which players play, against who, and when?',
  'Easter eggs anyone… we shall see who unlocks them.',
]
const HERITAGE_STATIC = [
  'Auckland softball has been played since 1939 — nearly ninety years of history.',
  'The NFS has crowned twenty seasons of premier fastpitch champions since 2005.',
]

function buildFacts(): string[] {
  const facts: string[] = [...HERITAGE_STATIC]
  const gLabel = { men: "Premier Men's", women: "Premier Women's" } as const

  // Every award, every season — the time portal
  for (const s of HONOURS) {
    for (const grade of ['men', 'women'] as const) {
      for (const [key, winner] of Object.entries(s[grade])) {
        if (!winner) continue
        facts.push(`${s.season}: ${winner} won the ${gLabel[grade]} ${AWARD_LABELS[key] ?? key} award.`)
      }
    }
  }

  // Placings — round robin and grand final winners
  for (const p of PLACINGS) {
    if (p.men_rr) facts.push(`${p.season}: ${p.men_rr} topped the Men's round robin.`)
    if (p.men_final) facts.push(`${p.season}: ${p.men_final} won the Men's grand final.`)
    if (p.women_rr) facts.push(`${p.season}: ${p.women_rr} topped the Women's round robin.`)
    if (p.women_final) facts.push(`${p.season}: ${p.women_final} won the Women's grand final.`)
  }

  // Heritage champions
  for (const h of HERITAGE_MEN) facts.push(`${h.season}: ${h.winner} were Auckland Major Men's champions.`)
  for (const h of HERITAGE_WOMEN) facts.push(`${h.season}: ${h.winner} won the Women's championship.`)

  // Series Teams — every selection is a fact
  for (const st of SERIES_TEAMS) {
    const g = st.grade === 'men' ? "Men's" : "Women's"
    for (const name of st.players) {
      facts.push(`${st.season}: ${name} was named in the ${g} Series Team.`)
    }
  }

  // Career games — definitive all-time list
  CAREER_MEN.forEach((c, i) => {
    facts.push(i === 0
      ? `${c.name} has played ${c.games} Premier games — the most of any man in Auckland softball history.`
      : `${c.name} has played ${c.games} Premier career games (#${i + 1} all-time among the men).`)
  })
  CAREER_WOMEN.forEach((c, i) => {
    facts.push(i === 0
      ? `${c.name} has played ${c.games} Premier games — the most of any woman in Auckland softball history.`
      : `${c.name} has played ${c.games} Premier career games (#${i + 1} all-time among the women).`)
  })

  // Milestone games — the season each player crossed 100, 200 and 300
  const TIER_WORD: Record<number, string> = { 100: 'Veteran', 200: 'Club Legend', 300: 'Icon' }
  for (const m of MILESTONES) {
    const g = m.grade === 'men' ? "Men's" : "Women's"
    const club = m.club ? ` with ${m.club}` : ''
    facts.push(m.tier === 300
      ? `${m.season}: ${m.name} passed 300 Premier games${club} — ${g} Icon status, reached by only a handful in the game's history.`
      : `${m.season}: ${m.name} passed ${m.tier} Premier games${club} in the ${g} grade — ${TIER_WORD[m.tier]}.`)
  }

  // Challenge shields — every defence and every change of hands
  for (const e of SHIELD_EVENTS) {
    const when = e.date ? ` — ${e.date}` : ''
    facts.push(e.result === 'Lost'
      ? `${e.challenger} took the ${e.shield} off ${e.holder}${when}.`
      : `${e.holder} defended the ${e.shield} against ${e.challenger}${when}.`)
  }
  for (const h of SHIELD_HOLDERS) {
    facts.push(`${h.holder} hold the ${h.shield}, won ${h.since}. It changes hands only when a challenger wins it.`)
  }
  facts.push('The Trevor Rouse Shield and the Collen Callaghan Shield are challenge trophies — hold them until someone beats you.')

  return facts
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FactsTicker({ compact = false }: { compact?: boolean }) {
  // Every 4th slot is an announcement; the rest are history facts
  const slots = useMemo(() => {
    const history = shuffle(buildFacts())
    const news = shuffle(ANNOUNCEMENTS)
    const out: { text: string; announcement: boolean }[] = []
    let h = 0, n = 0
    for (let i = 0; i < history.length + news.length; i++) {
      if (i % 4 === 3 && n < news.length) {
        out.push({ text: news[n++], announcement: true })
      } else if (h < history.length) {
        out.push({ text: history[h++], announcement: false })
      } else if (n < news.length) {
        out.push({ text: news[n++], announcement: true })
      }
    }
    return out
  }, [])
  const facts = slots
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % facts.length)
        setVisible(true)
      }, 400)
    }, 6000)
    return () => clearInterval(t)
  }, [facts.length])

  const isNews = !!facts[idx]?.announcement
  const accent = isNews ? '#4DA6FF' : '#E8C15A'

  return (
    <section className="relative px-5 sm:px-12 pinstripe overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 120% at 50% 50%, #16264C 0%, #0B1226 70%)',
        borderTop: `1px solid ${accent}55`,
        borderBottom: `1px solid ${accent}55`,
        padding: compact ? '24px 18px' : '38px 20px',
        borderRadius: compact ? '18px' : undefined,
        transition: 'border-color 0.4s ease',
      }}>

      {/* Accent glow behind the fact — colour tracks the slot type */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 90% at 50% 50%, ${accent}18 0%, transparent 70%)`,
          transition: 'background 0.4s ease',
        }} />

      <div className="relative flex flex-col items-center text-center gap-3" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <span className="text-[11px] font-black uppercase tracking-[0.4em]"
          style={{ color: accent, textShadow: `0 0 16px ${accent}70`, transition: 'color 0.4s ease' }}>
          {isNews ? 'Fantasy Announcement' : 'Did you know'}
        </span>

        {/* Glowing rule under the label */}
        <span style={{
          width: '54px', height: '2px', borderRadius: '2px',
          background: accent, boxShadow: `0 0 12px ${accent}`, opacity: 0.8,
          transition: 'background 0.4s ease',
        }} />

        <p className={(compact ? 'text-sm sm:text-base' : 'text-lg sm:text-2xl') + ' font-black leading-snug transition-opacity duration-400'}
          style={{
            fontFamily: 'var(--font-heading)',
            color: '#FFFFFF',
            opacity: visible ? 1 : 0,
            minHeight: compact ? '42px' : '58px',
            textShadow: `0 0 22px ${accent}55`,
            maxWidth: '700px',
          }}>
          {facts[idx]?.text}
        </p>
      </div>
    </section>
  )
}