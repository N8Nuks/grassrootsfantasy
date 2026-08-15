'use client'
import { useEffect, useRef, useState } from 'react'

/* Outline lockup behind the NFS hero — NFS crest, divider, GF crystal.
   Sits dim while the page is moving. If the visitor stops, it lifts slowly to a
   capped brightness and holds there. Any scroll drops it back. Never loops, so
   it reads as a reward for pausing rather than a distraction. */
export default function NfsBackdrop() {
  const [lit, setLit] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const arm = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setLit(true), 1400)
    }
    const onMove = () => {
      setLit(false)
      arm()
    }
    arm()
    window.addEventListener('scroll', onMove, { passive: true })
    return () => {
      window.removeEventListener('scroll', onMove)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden"
      style={{
        opacity: lit ? 0.2 : 0.055,
        transition: lit ? 'opacity 4.5s ease-in-out' : 'opacity 0.5s ease-out',
        filter: lit ? 'drop-shadow(0 0 18px #4DA6FF35)' : 'none',
      }}>
      <svg viewBox="0 0 660 300" className="w-full h-auto"
        style={{ maxWidth: '900px', minWidth: '620px' }}
        fill="none" strokeLinejoin="round" strokeLinecap="round"
        xmlns="http://www.w3.org/2000/svg">

        {/* ── NFS crest ── */}
        <g transform="translate(170,150)">
          <circle r="118" stroke="#F5F1E8" strokeWidth="2.5" />
          <circle r="106" stroke="#E03A3E" strokeWidth="2" />
          <circle r="74" stroke="#F5F1E8" strokeWidth="1.6" opacity="0.6" />

          {/* home plate */}
          <path d="M -44,-34 L 44,-34 L 44,14 L 0,52 L -44,14 Z" stroke="#F5F1E8" strokeWidth="2.4" />
          <path d="M -30,-26 Q -6,-4 -26,34" stroke="#F5F1E8" strokeWidth="1.2" opacity="0.5" />
          <path d="M 30,-26 Q 6,-4 26,34" stroke="#F5F1E8" strokeWidth="1.2" opacity="0.5" />

          <text y="9" textAnchor="middle" fontFamily="var(--font-heading), sans-serif"
            fontWeight="700" fontSize="32" stroke="#E03A3E" strokeWidth="1.5" letterSpacing="1">NFS</text>

          {/* curved wordmark — bottom path runs right-to-left so the text sits upright */}
          <path id="nfs-arc-top" d="M -90,0 A 90,90 0 0 1 90,0" />
          <path id="nfs-arc-bot" d="M 90,4 A 90,90 0 0 1 -90,4" />
          <text fontFamily="var(--font-heading), sans-serif" fontWeight="700" fontSize="21"
            stroke="#E03A3E" strokeWidth="1.3" letterSpacing="2">
            <textPath href="#nfs-arc-top" startOffset="50%" textAnchor="middle">NORTHERN</textPath>
          </text>
          <text fontFamily="var(--font-heading), sans-serif" fontWeight="700" fontSize="21"
            stroke="#E03A3E" strokeWidth="1.3" letterSpacing="2">
            <textPath href="#nfs-arc-bot" startOffset="50%" textAnchor="middle">FASTPITCH</textPath>
          </text>
        </g>

        {/* ── divider ── */}
        <line x1="330" y1="52" x2="330" y2="248" stroke="#F5F1E8" strokeWidth="1.5" opacity="0.4" />

        {/* ── GF crystal ── */}
        <g transform="translate(492,150)">
          {/* centre blade */}
          <path d="M 0,-108 L 22,-30 L 14,46 L 0,66 L -14,46 L -22,-30 Z" stroke="#3FBF63" strokeWidth="2.4" />
          <path d="M 0,-108 L 0,66" stroke="#3FBF63" strokeWidth="1.2" opacity="0.55" />
          {/* side blades */}
          <path d="M -74,-72 L -30,-6 L -18,40 L -34,16 L -62,-26 Z" stroke="#3FBF63" strokeWidth="2.2" />
          <path d="M 74,-72 L 30,-6 L 18,40 L 34,16 L 62,-26 Z" stroke="#3FBF63" strokeWidth="2.2" />
          {/* crystal wings */}
          <path d="M -96,-26 L -60,30 L -6,86 L 0,104 L -30,74 L -84,18 Z" stroke="#4DA6FF" strokeWidth="2.4" />
          <path d="M -60,30 L -30,74" stroke="#4DA6FF" strokeWidth="1.1" opacity="0.55" />
          <path d="M 96,-26 L 60,30 L 6,86 L 0,104 L 30,74 L 84,18 Z" stroke="#4DA6FF" strokeWidth="2.4" />
          <path d="M 60,30 L 30,74" stroke="#4DA6FF" strokeWidth="1.1" opacity="0.55" />
        </g>
      </svg>
    </div>
  )
}