'use client'

/* The HUD, overlay and ladder every arcade game was declaring for itself.

   Five games each had their own copy with a different two-letter prefix, which
   is why they drifted — stat values were 19px in Legends Cage, 18px in Golden
   Glove, 17px in Release Point, and nobody chose that. One declaration here,
   so the next change lands once.

   Colours come from --neon, which ArcadeShell sets per game, so each cabinet
   keeps its own accent without any of this knowing which game it's in. */

export type HudStat = {
  label: string
  value: string | number
  /* Overrides --neon for this value — used where a figure means something on
     its own, like outs going red. */
  colour?: string
  /* Long values (level names) need to sit smaller than numbers do. */
  small?: boolean
}

export function GameHud({ stats }: { stats: HudStat[] }) {
  return (
    <>
      <div className="gh-hud">
        {stats.map(s => (
          <span key={s.label} className="gh-stat">
            <span>{s.label}</span>
            <b style={{
              ...(s.colour ? { color: s.colour } : {}),
              ...(s.small ? { fontSize: '13px' } : {}),
            }}>{s.value}</b>
          </span>
        ))}
      </div>
      <GameStyles />
    </>
  )
}

/* A full-bleed panel over the game area. Games position it by putting it inside
   their own relatively-positioned stage. */
export function GameOverlay({ children, dim = false }: {
  children: React.ReactNode
  /* Lighter backdrop for a count-in, where the field should still read. */
  dim?: boolean
}) {
  return (
    <div className="gh-overlay" style={dim ? { background: '#05060Ab8' } : undefined}>
      {children}
    </div>
  )
}

export type Rung = {
  name: string
  /* Right-hand text — what it takes to pass, or 'Passed'. */
  note?: string
}

export function GameLadder({ rungs, current, done }: {
  rungs: Rung[]
  current: number
  /* All levels complete — every rung reads as passed. */
  done?: boolean
}) {
  return (
    <div className="gh-ladder">
      {rungs.map((r, i) => (
        <span key={r.name + i} className="gh-rung"
          data-on={i === current && !done}
          data-done={done || i < current}>
          <span className="gh-n">{i + 1}</span>
          {r.name}
          {r.note && <span className="gh-note">{r.note}</span>}
        </span>
      ))}
    </div>
  )
}

/* One declaration, rendered wherever the first of these components appears.
   Duplicated <style> tags are harmless — the browser dedupes identical rules —
   so each component can carry it without coordination. */
function GameStyles() {
  return (
    <style>{`
      .gh-hud {
        display: flex; align-items: stretch; gap: 1px; margin-bottom: 12px;
        background: #ffffff10; border: 1px solid #ffffff12;
      }
      .gh-stat { flex: 1; background: #07080D; padding: 11px 6px; text-align: center; }
      .gh-stat span {
        display: block; font-size: 8px; font-weight: 800; letter-spacing: 0.22em;
        text-transform: uppercase; color: #4E5A6A;
      }
      .gh-stat b {
        display: block; font-family: var(--font-heading); font-weight: 900;
        font-size: 18px; color: #F5F1E8; margin-top: 3px;
      }

      .gh-overlay {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 8px; text-align: center;
        background: #05060AF0; padding: 24px; z-index: 10;
      }

      .gh-ladder { display: flex; flex-direction: column; gap: 6px; margin-top: 20px; }
      .gh-rung {
        display: flex; align-items: center; gap: 11px; padding: 10px 13px;
        border: 1px solid #ffffff12; background: #ffffff05;
        font-size: 11px; color: #7D8B9C;
      }
      .gh-rung[data-on="true"] {
        border-color: var(--neon); color: #F5F1E8;
        background: color-mix(in srgb, var(--neon) 10%, transparent);
      }
      .gh-rung[data-done="true"] { color: #39FF9E; }
      .gh-n { font-family: var(--font-heading); font-weight: 900; color: #3E4A58; width: 16px; }
      .gh-note {
        margin-left: auto; font-size: 10px; letter-spacing: 0.14em;
        text-transform: uppercase;
      }
    `}</style>
  )
}