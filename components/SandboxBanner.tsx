export default function SandboxBanner() {
  return (
    <div className="text-center" style={{ background: 'linear-gradient(90deg, #E8983A20, #E8983A35, #E8983A20)', borderBottom: '1px solid #E8983A50', padding: '10px 16px', marginTop: '64px' }}>
      <p className="text-[11px] font-bold leading-snug" style={{ color: '#F5E6C8' }}>
        <span className="font-black uppercase tracking-widest" style={{ color: '#E8983A' }}>Sandbox season</span>
        {' '}— PRACTICE ROUNDS with simulated game-stats run every 3-5 days in August. All teams will be cleeared and reset for the real season in September.
      </p>
    </div>
  )
}