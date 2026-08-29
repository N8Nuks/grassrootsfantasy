'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/* A quiet line under a game. Signed-in players never see it. Nothing is
   gated — the pull is that your team name rides on your scores. */
export default function ArcadeSignIn() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && !user) setShow(true)
    })()
    return () => { cancelled = true }
  }, [])

  if (!show) return null

  return (
    <p style={{
      fontSize: '11px', lineHeight: 1.6, color: '#5C6878',
      textAlign: 'center', marginTop: '22px',
    }}>
      <a href="/login" style={{ color: 'var(--neon)', fontWeight: 700 }}>Sign in</a>
      {' '}to put your team name on your scores when you share them.
    </p>
  )
}