'use client'
import { useState, useEffect, useMemo } from 'react'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'
import { PLACINGS, HERITAGE_MEN, HERITAGE_WOMEN, SERIES_TEAMS, CAREER_MEN, CAREER_WOMEN } from '@/lib/nfsHistory'

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
  const facts = useMemo(() => shuffle(buildFacts()), [])
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
        <span className="text-[10px] font-black uppercase tracking-[0.35em] shrink-0" style={{ color: '#E8C15A' }}>Did you know</span>
        <p className="text-sm font-bold text-white/85 transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0, minHeight: '20px' }}>
          {facts[idx]}
        </p>
      </div>
    </section>
  )
}