'use client'
import { useState, useEffect, useMemo } from 'react'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'
import { PLACINGS, HERITAGE_MEN, HERITAGE_WOMEN, SERIES_TEAMS, CAREER_MEN, CAREER_WOMEN } from '@/lib/nfsHistory'

// Announcements — every 4th ticker slot. Louder styling, current news.
const ANNOUNCEMENTS = [
  'Season One of the NFS Premier Fantasy League starts October 3.',
  'Sandbox season is running now — practice rounds, simulated stats, all teams reset in September.',
  "One account plays both the Men's and Women's grades.",
  'Free to play.',
  'Endorsed by the Auckland Softball Association.',
  'Register and your 12-card Starter Pack lands instantly.',
  'Your Starter Pack is the only place two-way player cards are ever dealt.',
  'Your lineup auto-fills the moment you register — you can score from day one.',
  'A Pre-Season Pack takes your squad to 21 cards before Round 1.',
  "Register with your club's code.",
  'Lineups lock on Friday night, before the weekend games.',
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
  'Over 1,100 moments of NFS history live in this ticker.',
  'Every Premier award winner since 2004-05 is on the Honours Board.',
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

export default function FactsTicker() {
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

  return (
    <section className="px-6 sm:px-12 pinstripe" style={{ background: '#10192E', borderTop: '1px solid #2456E640', borderBottom: '1px solid #2456E640', padding: '28px 24px' }}>
      <div className="flex items-center justify-center gap-5 flex-wrap text-center" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <span className="text-[10px] font-black uppercase tracking-[0.35em] shrink-0"
          style={{ color: facts[idx]?.announcement ? '#4DA6FF' : '#E8C15A' }}>
          {facts[idx]?.announcement ? 'Announcement' : 'Did you know'}
        </span>
        <p className={facts[idx]?.announcement ? 'text-base font-black transition-opacity duration-400' : 'text-sm font-bold text-white/85 transition-opacity duration-400'}
          style={{ opacity: visible ? 1 : 0, minHeight: '20px', color: facts[idx]?.announcement ? '#FFFFFF' : undefined, textShadow: facts[idx]?.announcement ? '0 0 14px #4DA6FF60' : undefined }}>
          {facts[idx]?.text}
        </p>
      </div>
    </section>
  )
}