'use client'

import { useState } from 'react'

const GAMES_URL = 'grassrootsfantasy.co.nz/games'

type Props = {
  lines: string[]
  teamName?: string | null
  label?: string
  className?: string
}

export default function ArcadeShare({ lines, teamName, label = 'Share', className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

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