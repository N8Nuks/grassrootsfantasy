import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AvatarLab from './AvatarLab'

export default async function AvatarsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/team')

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0D0D0F' }}>
      <Nav />
      <section className="flex-1 px-6" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '980px', marginLeft: 'auto', marginRight: 'auto' }}>
          <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#E8C15A', marginBottom: '10px' }}>Admin · Not live</p>
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)', marginBottom: '10px' }}>Avatar Lab</h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ maxWidth: '520px', marginBottom: '32px' }}>
            Procedural manager avatars — 5,000 combinations from five layers. Silhouettes are placeholders
            standing in until artwork is commissioned; backdrops, motifs, colourways and frames are final.
          </p>
          <AvatarLab />
        </div>
      </section>
      <Footer />
    </main>
  )
}