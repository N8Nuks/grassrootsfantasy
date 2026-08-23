'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/* A quiet count of how many times a page has been opened. It counts loads
   rather than people — a refresh adds one — so the label says views. */
export default function ViewTicker({ page, accent = '#E8C15A' }: {
  page: string
  accent?: string
}) {
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.rpc('bump_page_view', { p_page: page }).then(({ data, error }) => {
      if (!cancelled && !error && typeof data === 'number') setViews(data)
    })
    return () => { cancelled = true }
  }, [page])

  if (views === null) return null

  return (
    <p style={{
      fontSize: '10px', fontWeight: 900, letterSpacing: '0.28em',
      textTransform: 'uppercase', color: '#ffffff30', textAlign: 'center',
      marginTop: '10px',
    }}>
      <span style={{ color: accent }}>{views.toLocaleString()}</span> page views
    </p>
  )
}