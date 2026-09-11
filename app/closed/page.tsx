/* Shown in place of any page in UNDER_CONSTRUCTION. Deliberately standalone —
   no Nav, no Supabase, nothing that can fail while the database is being
   cleared out from under it. */
export default function Closed() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#05060A', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ maxWidth: '38ch' }}>
        <p style={{
          fontSize: '10px', fontWeight: 900, letterSpacing: '0.34em',
          textTransform: 'uppercase', color: '#E8983A', marginBottom: '18px',
        }}>
          Under construction
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 800, textTransform: 'uppercase',
          fontSize: 'clamp(28px, 8vw, 44px)', lineHeight: 1, color: '#F5F1E8',
          transform: 'skewX(-7deg)', margin: '0 0 20px',
        }}>
          Back on the 18th
        </h1>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#8FA0B4', margin: '0 0 14px' }}>
          We&apos;re clearing the sandbox and loading the real 2026/27 rosters,
          player photos and career records.
        </p>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#8FA0B4', margin: '0 0 30px' }}>
          Registration reopens <b style={{ color: '#FFFFFF' }}>18 September</b>,
          first round <b style={{ color: '#FFFFFF' }}>26 September</b>.
        </p>
        <a href="/games" style={{
          display: 'inline-block', textDecoration: 'none',
          border: '1px solid #3FBF63', color: '#3FBF63',
          fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '13px',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          padding: '14px 28px', transform: 'skewX(-7deg)',
        }}>
          <span style={{ display: 'inline-block', transform: 'skewX(7deg)' }}>
            The arcade is still open
          </span>
        </a>
      </div>
    </main>
  )
}