import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/* HIGH TIDE admin — listings moderation.
   GET  ?status=pending|needs_info|approved|rejected|all  → rows with GF player name
   POST { action, id, admin_note }        action: approve | needs_info | reject | deactivate | reactivate
   POST { action: 'create', listing }     admin-loaded listing. first_name + last_name are the owner's real
                                          name (required); player_name is their GF name (optional) and is
                                          matched to players.full_name */

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  const status = new URL(req.url).searchParams.get('status') ?? 'pending'
  const admin = createAdminClient()

  let q = admin.from('listings')
    .select('id, business_name, blurb, category, area, phone, email, website, socials, logo_url, status, admin_note, active, paid_until, created_at, approved_at, first_name, last_name, player_id, players(full_name)')
    .order('created_at', { ascending: false })
  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    player_name: r.players?.full_name ?? null,
    players: undefined,
  }))
  return NextResponse.json({ listings: rows })
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if (body.action === 'create') {
    const l = body.listing ?? {}
    if (!l.first_name?.trim() || !l.last_name?.trim()) {
      return NextResponse.json({ error: 'Real first name and last name are required' }, { status: 400 })
    }
    if (!l.business_name?.trim() || !l.blurb?.trim() || !l.category) {
      return NextResponse.json({ error: 'business_name, blurb and category are required' }, { status: 400 })
    }
    if (!l.phone?.trim() && !l.email?.trim() && !l.website?.trim()) {
      return NextResponse.json({ error: 'At least one of phone, email or website is required' }, { status: 400 })
    }

    // Optional GF name → player link (active, not a minor)
    let player_id: string | null = null
    let player_note = ''
    if (l.player_name?.trim()) {
      const { data: p } = await admin.from('players')
        .select('id, full_name, is_under18')
        .ilike('full_name', l.player_name.trim())
        .eq('active', true)
        .limit(2)
      if (!p || p.length === 0) player_note = `no GF player match for "${l.player_name.trim()}" — saved without a player link`
      else if (p.length > 1) player_note = `"${l.player_name.trim()}" matches more than one player — saved without a player link`
      else if (p[0].is_under18) return NextResponse.json({ error: 'That player is under 18 — High Tide cannot list minors' }, { status: 400 })
      else player_id = p[0].id
    }

    const { data, error } = await admin.from('listings').insert({
      owner_id: null,
      player_id,
      first_name: l.first_name.trim(),
      last_name: l.last_name.trim(),
      business_name: l.business_name.trim(),
      blurb: l.blurb.trim().slice(0, 160),
      category: l.category,
      area: l.area?.trim() || null,
      phone: l.phone?.trim() || null,
      email: l.email?.trim() || null,
      website: l.website?.trim() || null,
      socials: l.socials?.trim() || null,
      logo_url: l.logo_url?.trim() || null,
      status: l.approve ? 'approved' : 'pending',
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id, player_id, note: player_note || null })
  }

  const id = String(body.id ?? '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  switch (body.action) {
    case 'approve':    patch.status = 'approved'; patch.admin_note = null; patch.active = true; break
    case 'needs_info': patch.status = 'needs_info'; patch.admin_note = body.admin_note?.trim() || 'More information needed'; break
    case 'reject':     patch.status = 'rejected'; patch.admin_note = body.admin_note?.trim() || null; break
    case 'deactivate': patch.active = false; break
    case 'reactivate': patch.active = true; break
    default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const { data, error } = await admin.from('listings').update(patch).eq('id', id)
    .select('id, business_name, status, active').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing: data })
}