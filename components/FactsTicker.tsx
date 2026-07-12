'use client'
import { useState, useEffect } from 'react'

// PLACEHOLDER FACTS — replace with verified NFS / Auckland Softball history from Nate.
// Format: short, punchy, one line. Categories mix records, milestones, and heritage.
const FACTS = [
  'Auckland softball has been played since 1939 — nearly ninety years of history.',
  'The NFS has crowned twenty seasons of premier fastpitch champions since 2005.',
  'Only eight players have ever reached 300 career games.',
  '[PLACEHOLDER] Top Women\u2019s hitter of 2008: —',
  '[PLACEHOLDER] Most stolen bases all-time, Men\u2019s: —',
  '[PLACEHOLDER] Longest hitting streak in NFS history: —',
]

export default function FactsTicker() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % FACTS.length)
        setVisible(true)
      }, 400)
    }, 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="px-6 sm:px-12 pinstripe" style={{ background: '#10192E', borderTop: '1px solid #2456E640', borderBottom: '1px solid #2456E640', padding: '28px 24px' }}>
      <div className="flex items-center justify-center gap-5 flex-wrap text-center" style={{ maxWidth: '820px', margin: '0 auto' }}>
        <span className="text-[10px] font-black uppercase tracking-[0.35em] shrink-0" style={{ color: '#E8C15A' }}>Did you know</span>
        <p className="text-sm font-bold text-white/85 transition-opacity duration-400"
          style={{ opacity: visible ? 1 : 0, minHeight: '20px' }}>
          {FACTS[idx]}
        </p>
      </div>
    </section>
  )
}
