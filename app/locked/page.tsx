/* Shown in place of register and login while accounts are being cleared. */
export default function Locked() {
  return (
    <main className="cl-root">
      <span className="cl-art" aria-hidden="true" />
      <span className="cl-scrim" aria-hidden="true" />

      <div className="cl-box">
        <p className="cl-eyebrow">Closed for the changeover</p>
        <h1 className="cl-head">Back on the 18th</h1>
        <p className="cl-body">
          Every account is being cleared so we can load the real season. Nothing
          carries over — everyone signs up again and claims their team name fresh.
        </p>
        <p className="cl-body">
          Registration reopens <b>18 September</b>.
        </p>
        <a className="cl-btn" href="/games">
          <span>The arcade is still open</span>
        </a>
      </div>

      <style>{`
        .cl-root {
          position: relative; min-height: 100vh; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          background: #05060A; padding: 24px; text-align: center;
          isolation: isolate;
        }
        .cl-art {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: url('/banner-neon.webp') center / cover no-repeat;
          opacity: 0.5;
        }
        .cl-scrim {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 70% 60% at 50% 50%, #05060AF2 0%, #05060ACC 55%, #05060A80 100%);
        }
        .cl-box { position: relative; z-index: 2; max-width: 38ch; }

        .cl-eyebrow {
          font-size: 10px; font-weight: 900; letter-spacing: 0.34em;
          text-transform: uppercase; color: #FFC46B; margin: 0 0 18px;
          text-shadow: 0 0 14px #E8983A90;
        }
        .cl-head {
          font-family: var(--font-heading); font-weight: 800; text-transform: uppercase;
          font-size: clamp(28px, 8vw, 46px); line-height: 1; color: #F5F1E8;
          transform: skewX(-7deg); margin: 0 0 20px;
          text-shadow: 0 2px 20px #05060A;
        }
        .cl-body {
          font-size: 14px; line-height: 1.8; color: #B8C4D2; margin: 0 0 14px;
          text-shadow: 0 2px 14px #05060A;
        }
        .cl-body b { color: #FFFFFF; }
        .cl-btn {
          display: inline-block; text-decoration: none; margin-top: 18px;
          border: 1px solid #3FBF63; color: #3FBF63; background: #05060A80;
          font-family: var(--font-heading); font-weight: 800; font-size: 13px;
          letter-spacing: 0.18em; text-transform: uppercase;
          padding: 14px 28px; transform: skewX(-7deg);
          transition: background 140ms ease, box-shadow 140ms ease;
        }
        .cl-btn span { display: inline-block; transform: skewX(7deg); }
        .cl-btn:hover {
          background: #3FBF6320;
          box-shadow: 0 0 24px #3FBF6350;
        }
      `}</style>
    </main>
  )
}