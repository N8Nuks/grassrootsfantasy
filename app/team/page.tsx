import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

export default async function Team() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('team_name, clubs(name)').eq('id', user!.id).single()

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#141210' }}>
      <Nav />
      <section className="relative flex-1 px-6" style={{ paddingTop: "160px", paddingBottom: "120px" }}>
        <div className="text-center" style={{ maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
          <p className="text-xs font-black uppercase tracking-[0.3em] mb-4" style={{ color: '#2D9E4E' }}>My Team</p>
          <h1 className="text-3xl sm:text-4xl font-black text-[#F5F1E8] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            {profile?.team_name || 'Your team'}
          </h1>
          <p className="text-sm text-[#F5F1E8]/45">
            You're in. Squad, lineup card, and packs land here next.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  )
}