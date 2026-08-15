'use client'
import { useEffect, useRef, useState } from 'react'

/* The two marks sitting behind the top of the NFS page — NFS crest, divider,
   GF crystal. Dim while the page is moving; if the visitor stops, it lifts to a
   brighter hold. Any scroll drops it back. Never loops.

   Note: NFS-logo.png carries a wide transparent margin, so its box is oversized
   and pulled back with horizontal negative margins — the crest renders large
   without the two marks colliding. Cropping the source PNG would remove the need
   for all of this. */
export default function NfsBackdrop() {
  const [lit, setLit] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const arm = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setLit(true), 1200)
    }
    const onMove = () => { setLit(false); arm() }
    arm()
    window.addEventListener('scroll', onMove, { passive: true })
    return () => {
      window.removeEventListener('scroll', onMove)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none flex items-start justify-center overflow-hidden"
      style={{
        opacity: lit ? 0.42 : 0.12,
        transition: lit ? 'opacity 3.5s ease-in-out' : 'opacity 0.5s ease-out',
        paddingTop: '4vh',
      }}>
      <div className="flex items-center justify-center gap-2 sm:gap-10 w-full"
        style={{
          maxWidth: '1000px',
          filter: lit ? 'drop-shadow(0 0 26px #4DA6FF30)' : 'none',
          transition: 'filter 3.5s ease-in-out',
        }}>

        {/* NFS crest */}
        <div className="shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            width: 'min(46vw, 480px)',
            aspectRatio: '1',
            marginLeft: 'min(-12vw, -110px)',
            marginRight: 'min(-12vw, -110px)',
          }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/NFS-logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* Divider — desktop only, there isn't room for it on a phone */}
        <div className="shrink-0 hidden sm:block"
          style={{ width: '1px', height: 'min(26vw, 230px)', background: '#F5F1E8', opacity: 0.28 }} />

        {/* GF crystal */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gf-mark.png" alt="" className="shrink-0"
          style={{ width: 'min(26vw, 230px)', height: 'auto', objectFit: 'contain' }} />
      </div>
    </div>
  )
}