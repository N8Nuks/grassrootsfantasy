export default function SandboxBanner() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #E8983A18, #E8983A32, #E8983A18)',
      borderBottom: '2px solid #E8983A70',
      padding: '18px 20px',
      marginTop: '64px',
    }}>
      <div className="text-center" style={{ maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto' }}>
        <p className="font-black uppercase tracking-[0.28em]"
          style={{ color: '#E8983A', fontSize: '11px', marginBottom: '8px' }}>
          Sandbox closing
        </p>
        <p className="font-black leading-tight"
          style={{ fontFamily: 'var(--font-heading)', color: '#F5F1E8', fontSize: '19px', marginBottom: '10px' }}>
          Everyone needs to register again.
        </p>
        <p className="leading-relaxed" style={{ color: '#F5E6C8', fontSize: '13px' }}>
          The practice season ends this weekend. Every team, squad and account is being
          cleared so we can load the real 2026/27 rosters — nothing carries over, so you&apos;ll
          need to sign up again and claim your team name.
        </p>
        <p className="leading-relaxed" style={{ color: '#F5E6C8', fontSize: '13px', marginTop: '10px' }}>
          Registration reopens <b style={{ color: '#FFFFFF' }}>18 September</b> ·
          first round <b style={{ color: '#FFFFFF' }}>26 September</b> ·
          first scores <b style={{ color: '#FFFFFF' }}>29 September</b>
        </p>
      </div>
    </div>
  )
}