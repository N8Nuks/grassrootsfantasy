/* The arcade is a separate world from the league — asphalt, floodlight haze,
   chain-link and CRT lines. Every game page wears this shell so the illusion
   holds from the front door through to the game itself.

   Each game brings its own neon, passed in as `neon`, which tints the haze,
   the headings and every control on the page. */
import ArcadeSignIn from './ArcadeSignIn'
import ViewTicker from './ViewTicker'   
export default function ArcadeShell({ neon, eyebrow, title, page, children }: {
  neon: string
  eyebrow: string
  title: string
  page?: string
  children: React.ReactNode
}) {
  return (
    <main className="ar-root" style={{ ['--neon' as string]: neon }}>
      <style>{`
        .ar-root {
          --ink: #05060A;
          min-height: 100vh; background: var(--ink);
          position: relative; overflow-x: hidden; display: flex; flex-direction: column;
        }
        .ar-flood {
          position: absolute; inset: -20% -10% auto -10%; height: 80vh; pointer-events: none;
          background:
            radial-gradient(ellipse 44% 62% at 20% 0%, color-mix(in srgb, var(--neon) 16%, transparent) 0%, transparent 64%),
            radial-gradient(ellipse 44% 62% at 80% 4%, color-mix(in srgb, var(--neon) 11%, transparent) 0%, transparent 64%);
          animation: ar-drift 14s ease-in-out infinite alternate;
        }
        @keyframes ar-drift { to { transform: translate3d(0, 22px, 0) scale(1.05); } }
        .ar-fence {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.09;
          background-image:
            linear-gradient(45deg, transparent 46%, #9FB0C0 46%, #9FB0C0 54%, transparent 54%),
            linear-gradient(-45deg, transparent 46%, #9FB0C0 46%, #9FB0C0 54%, transparent 54%);
          background-size: 34px 34px;
          mask-image: radial-gradient(ellipse 82% 66% at 50% 34%, transparent 26%, black 92%);
          -webkit-mask-image: radial-gradient(ellipse 82% 66% at 50% 34%, transparent 26%, black 92%);
        }
        .ar-scan {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.45; mix-blend-mode: overlay;
          background: repeating-linear-gradient(180deg, #ffffff0d 0px, #ffffff0d 1px, transparent 1px, transparent 4px);
        }
        .ar-wrap { position: relative; z-index: 2; flex: 1; padding: 74px 20px 90px; }
        .ar-inner { max-width: 640px; margin: 0 auto; }

        .ar-back {
          display: inline-block; font-size: 11px; font-weight: 900; letter-spacing: 0.28em;
          text-transform: uppercase; color: #64748B; text-decoration: none;
        }
        .ar-back:hover { color: var(--neon); }

        .ar-eyebrow {
          font-size: 10px; font-weight: 900; letter-spacing: 0.5em; text-transform: uppercase;
          color: var(--neon); text-shadow: 0 0 14px color-mix(in srgb, var(--neon) 60%, transparent);
          margin-top: 26px;
        }
        /* Block-lettered comic display: heavy, skewed, hard ink shadow */
        .ar-title {
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: clamp(34px, 8.5vw, 54px); line-height: 0.92; letter-spacing: -0.03em;
          color: #F5F1E8; transform: skewX(-6deg); width: fit-content;
          text-shadow: 3px 3px 0 var(--ink), 5px 5px 0 color-mix(in srgb, var(--neon) 85%, transparent);
          margin: 12px 0 18px;
        }
        .ar-lede { font-size: 13px; line-height: 1.7; color: #8FA0B4; max-width: 42ch; }

        /* Shared arcade furniture — every game uses these */
        .ar-panel {
          background: linear-gradient(155deg, #0C0F16 0%, #07080D 100%);
          border: 1px solid color-mix(in srgb, var(--neon) 32%, transparent);
          box-shadow: 0 0 0 1px #ffffff08 inset, 0 18px 40px #00000090;
        }
        .ar-btn {
          display: inline-block; border: none; cursor: pointer; text-decoration: none;
          font-family: var(--font-heading); font-weight: 900; text-transform: uppercase;
          font-size: 14px; letter-spacing: 0.16em; color: var(--ink); background: var(--neon);
          padding: 15px 34px; transform: skewX(-8deg);
          box-shadow: 4px 4px 0 #00000090, 0 0 26px color-mix(in srgb, var(--neon) 45%, transparent);
          transition: transform 160ms cubic-bezier(.2,.8,.3,1), box-shadow 160ms ease;
        }
        .ar-btn > * { display: inline-block; transform: skewX(8deg); }
        .ar-btn:hover:not(:disabled) { transform: skewX(-8deg) translate(-2px, -2px); box-shadow: 6px 6px 0 #00000090, 0 0 34px color-mix(in srgb, var(--neon) 60%, transparent); }
        .ar-btn:active:not(:disabled) { transform: skewX(-8deg) translate(2px, 2px); box-shadow: 1px 1px 0 #00000090; }
        .ar-btn:disabled { opacity: 0.3; cursor: default; box-shadow: 4px 4px 0 #00000060; }
        .ar-btn:focus-visible { outline: 2px solid #F5F1E8; outline-offset: 4px; }

        .ar-chip {
          display: inline-block; font-size: 9px; font-weight: 900; letter-spacing: 0.3em;
          text-transform: uppercase; color: var(--ink); background: var(--neon);
          padding: 5px 11px; transform: skewX(-9deg);
        }
        .ar-num {
          font-family: var(--font-heading); font-weight: 900; line-height: 1;
          color: var(--neon); text-shadow: 0 0 26px color-mix(in srgb, var(--neon) 60%, transparent);
        }
        .ar-foot {
          margin-top: 46px; padding-top: 18px; border-top: 1px dashed #ffffff18;
          font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #4E5A6A;
          text-align: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .ar-flood { animation: none; }
          .ar-btn { transition: none; }
        }
      `}</style>

      <div className="ar-flood" />
      <div className="ar-fence" />
      <div className="ar-scan" />

      <div className="ar-wrap">
        <div className="ar-inner">
          <a href="/games" className="ar-back">← Arcade</a>
          <p className="ar-eyebrow">{eyebrow}</p>
          <h1 className="ar-title">{title}</h1>
          {children}
          <ArcadeSignIn />
          {page && <ViewTicker page={page} accent={neon} />}
          <p className="ar-foot">Grassroots Fantasy Arcade</p>
        </div>
      </div>
    </main>
  )
}