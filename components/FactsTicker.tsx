'use client'
import { useState, useEffect, useMemo } from 'react'
import { HONOURS, AWARD_LABELS } from '@/lib/nfsHonours'

// Static heritage facts
const HERITAGE = [
  'Auckland softball has been played since 1939 — nearly ninety years of history.',
  'The NFS has crowned twenty seasons of premier fastpitch champions since 2005.',
  'Only eight players have ever reached 300 career games.',
]

// Count wins per player for a given grade + award key
function tally(grade: 'men' | 'women', key: string): [string, number][] {
  const counts = new Map<string, number>()
  for (const s of HONOURS) {
    const winner = s[grade][key]
    if (!winner) continue
    counts.set(winner, (counts.get(winner) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

function buildFacts(): string[] {
  const facts: string[] = [...HERITAGE]
  const gradeLabel = { men: "Premier Men's", women: "Premier Women's" } as const

  for (const grade of ['men', 'women'] as const) {
    for (const key of ['mvp', 'top_batter', 'top_pitcher', 'most_hr', 'most_sb'] as const) {
      const leaders = tally(grade, key)
      if (leaders.length === 0) continue
      const [name, wins] = leaders[0]
      if (wins >= 2) {
        facts.push(`${name} has won the ${gradeLabel[grade]} ${AWARD_LABELS[key]} award ${wins} times — more than anyone in NFS history.`)
      }
    }
    // Most recent MVP
    for (let i = HONOURS.length - 1; i >= 0; i--) {
      const w = HONOURS[i][grade]['mvp']
      if (w) {
        facts.push(`${w} is the reigning ${gradeLabel[grade]} MVP (${HONOURS[i].season}).`)
        break
      }
    }
  }

  // Special award namesakes
  const nnWinners = tally('men', 'nathan_nukunuku')
  if (nnWinners.length > 0) {
    facts.push(`The Nathan Nukunuku Award has been presented to the Premier Men since 2020-21 — ${nnWinners[0][0]} ${nnWinners[0][1] > 1 ? `has won it ${nnWinners[0][1]} times` : 'is among its winners'}.`)
  }
  const rbWinners = tally('women', 'rebecca_bromhead')
  if (rbWinners.length > 0) {
    facts.push(`The Rebecca Bromhead Award honours the Premier Women — ${rbWinners[0][0]} ${rbWinners[0][1] > 1 ? `has won it ${rbWinners[0][1]} times` : 'is among its winners'}.`)
  }

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