'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const GAMES_URL = 'grassrootsfantasy.co.nz/games'

type Props = {
  lines: string[]
  teamName?: string | null
  label?: string
  className?: string
}

export default function ArcadeShare({ lines, teamName, label = 'Share', className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  
  const [fetchedName, setFetchedName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (teamName !== undefined) return
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('team_name').eq('id', user.id).maybeSingle()
      if (!cancelled) setFetchedName(data?.team_name ?? null)
    })()
    return () => { cancelled = true }
  }, [teamName])

  const name = teamName !== undefined ? teamName : fetchedName
  function buildMessage() {
    const parts: string[] = []
    if (teamName && teamName.trim()) parts.push(teamName.trim())
    for (const l of lines) {
      if (l && l.length) parts.push(l)
    }
    parts.push(GAMES_URL)
    return parts.join('\n')
  }

  async function handleShare() {
    const text = buildMessage()

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text })
        return
      } catch (err) {
        const name = (err as { name?: string })?.name
        if (name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('failed')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const text = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-live="polite"
      className={
        'inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 ' +
        'px-4 py-2 text-sm font-medium text-white transition ' +
        'hover:border-white/50 hover:bg-white/10 active:scale-[0.98] ' +
        className
      }
    >
      {text}
    </button>
  )
}