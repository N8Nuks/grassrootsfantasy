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
    if (name && name.trim()) parts.push(name.trim())
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

  const text = state === 'copied' ? 'Copied' : state === 'failed' ? "Couldn't copy" : label

  return (
    <>
      {/* The arcade's own button language — skewed, Oxanium, neon outline.
          Deliberately the ghost variant rather than the filled one: it sits
          alongside "Start again" and shouldn't compete with it. */}
      <style>{`
        .ash {
          display: inline-flex; align-items: center; gap: 9px;
          border: 1px solid var(--neon, #F5F1E8);
          background: transparent;
          color: var(--neon, #F5F1E8);
          font-family: var(--font-heading); font-weight: 800;
          font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase;
          padding: 13px 26px; cursor: pointer;
          transform: skewX(-7deg);
          transition: background 140ms ease, box-shadow 140ms ease, color 140ms ease;
        }
        .ash > span { transform: skewX(7deg); display: inline-flex; align-items: center; gap: 9px; }
        .ash:hover {
          background: color-mix(in srgb, var(--neon, #F5F1E8) 14%, transparent);
          box-shadow: 0 0 20px color-mix(in srgb, var(--neon, #F5F1E8) 40%, transparent);
        }
        .ash:active { transform: skewX(-7deg) translate(2px, 2px) scale(0.98); }
        .ash svg { width: 14px; height: 14px; flex: none; }

        /* Confirmation reads as a state change, not a label swap */
        .ash[data-state="copied"] {
          background: #39FF9E; border-color: #39FF9E; color: #05060A;
          box-shadow: 0 0 24px #39FF9E55;
        }
        .ash[data-state="failed"] {
          border-color: #FF4D4D; color: #FF4D4D; background: transparent;
        }
      `}</style>

      <button
        type="button"
        onClick={handleShare}
        aria-live="polite"
        data-state={state}
        className={`ash ${className}`}
      >
        <span>
          {state === 'copied' ? (
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8.5L6.2 12L13 4.5" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 11V2M8 2L4.8 5.2M8 2l3.2 3.2" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.8 9.5v3.2a1.3 1.3 0 0 0 1.3 1.3h7.8a1.3 1.3 0 0 0 1.3-1.3V9.5"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
          {text}
        </span>
      </button>
    </>
  )
}