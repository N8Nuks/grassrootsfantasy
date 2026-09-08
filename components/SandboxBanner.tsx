export default function SandboxBanner() {
  return (
    <div className="text-center" style={{ background: 'linear-gradient(90deg, #E8983A20, #E8983A35, #E8983A20)', borderBottom: '1px solid #E8983A50', padding: '10px 16px', marginTop: '64px' }}>
      <p className="text-[11px] font-bold leading-snug" style={{ color: '#F5E6C8' }}>
        <span className="font-black uppercase tracking-widest" style={{ color: '#E8983A' }}>Sandbox closing</span>
        {' '}— the practice season ends this weekend. Teams are being cleared and registration is closed while we
        load the real 2026/27 rosters. Back open <strong style={{ color: '#F5E6C8' }}>18 September</strong>,
        first round <strong style={{ color: '#F5E6C8' }}>26 September</strong>, first scores locked in
        {' '}<strong style={{ color: '#F5E6C8' }}>29 September</strong>.
      </p>
    </div>
  )
}