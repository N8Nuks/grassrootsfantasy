import type { SupabaseClient } from '@supabase/supabase-js'

export type Player = {
  id: string
  full_name: string
  tier: string
  positions: string[]
  stats?: Record<string, number>
  photo_url?: string | null
  playing_number?: number | null
  reveal_pos?: string | null
  clubs?: { name: string } | null
}

export type DealtCard = {
  name: string
  tier: string
  positions: string[]
  club: string
  stats: Record<string, number>
  photoUrl: string | null
  playingNumber: number | null
  revealPos: string | null
}

// Weighted pick: players with fewer cards in circulation are more likely
export function weightedPick(pool: Player[], circulation: Map<string, number>, n: number): Player[] {
  const picks: Player[] = []
  const candidates = [...pool]
  for (let i = 0; i < n && candidates.length > 0; i++) {
    const maxCirc = Math.max(...candidates.map(p => circulation.get(p.id) ?? 0), 1)
    // weight = (maxCirc + 1) - own circulation  ->  under-dispersed players weigh more
    const weights = candidates.map(p => (maxCirc + 1) - (circulation.get(p.id) ?? 0))
    const total = weights.reduce((a, b) => a + b, 0)
    let roll = Math.random() * total
    let idx = 0
    for (; idx < weights.length; idx++) {
      roll -= weights[idx]
      if (roll <= 0) break
    }
    idx = Math.min(idx, candidates.length - 1)
    picks.push(candidates[idx])
    candidates.splice(idx, 1)
  }
  return picks
}

/* Pick 2 cards for one owner: ~80% Common / ~20% Elite per slot, never a duplicate
   of a player they already hold. Pure selection — writes nothing. */
export function pickTwo(pool: Player[], ownedIds: Set<string>, circulation: Map<string, number>): Player[] {
  const fresh = pool.filter(p => !ownedIds.has(p.id))
  const picks: Player[] = []
  for (let i = 0; i < 2; i++) {
    const tier = Math.random() < 0.2 ? 'elite' : 'common'
    const tierPool = fresh.filter(p => p.tier === tier && !picks.includes(p))
    const fallback = fresh.filter(p => (p.tier === 'common' || p.tier === 'elite') && !picks.includes(p))
    const source = tierPool.length > 0 ? tierPool : fallback
    picks.push(...weightedPick(source, circulation, 1))
  }
  return picks
}

export function toDealtCards(picks: Player[]): DealtCard[] {
  return picks.map(p => ({
    name: p.full_name,
    tier: p.tier,
    positions: p.positions,
    club: p.clubs?.name ?? '',
    stats: p.stats ?? {},
    photoUrl: p.photo_url ?? null,
    playingNumber: p.playing_number ?? null,
    revealPos: p.reveal_pos ?? null,
  }))
}

/* Load the active player pool and current circulation counts for a grade.
   Fetched once and reused across every owner in a bulk deal. */
export async function loadPoolAndCirculation(admin: SupabaseClient, grade: 'mens' | 'womens') {
  const [{ data: pool, error }, { data: allCards }] = await Promise.all([
    admin.from('players')
      .select('id, full_name, tier, positions, stats, photo_url, playing_number, reveal_pos, clubs(name)')
      .eq('grade', grade).eq('active', true),
    admin.from('cards').select('player_id').eq('grade', grade),
  ])
  if (error || !pool) return null
  const circulation = new Map<string, number>()
  for (const c of allCards ?? []) {
    circulation.set(c.player_id, (circulation.get(c.player_id) ?? 0) + 1)
  }
  return { pool: pool as unknown as Player[], circulation }
}

/* Auto-deal the unclaimed weekly pack for every owner in a grade who didn't
   claim it before the round advanced. Cards land straight in the collection —
   no reveal. Returns how many owners were dealt to. */
export async function autoDealUnclaimed(
  admin: SupabaseClient,
  grade: 'mens' | 'womens',
  roundId: string,
): Promise<{ dealt: number; cards: number }> {
  // Everyone registered in this grade (holds a T1)
  const { data: t1Cards } = await admin.from('cards')
    .select('owner_id').eq('grade', grade).eq('source', 't1')
  const owners = [...new Set((t1Cards ?? []).map(c => c.owner_id))]
  if (owners.length === 0) return { dealt: 0, cards: 0 }

  const { data: claims } = await admin.from('t3_claims')
    .select('owner_id').eq('grade', grade).eq('round_id', roundId)
  const claimed = new Set((claims ?? []).map(c => c.owner_id))
  const pending = owners.filter(o => !claimed.has(o))
  if (pending.length === 0) return { dealt: 0, cards: 0 }

  const loaded = await loadPoolAndCirculation(admin, grade)
  if (!loaded) return { dealt: 0, cards: 0 }
  const { pool, circulation } = loaded

  // Every card held in this grade, grouped by owner, so we can avoid duplicates
  const { data: owned } = await admin.from('cards')
    .select('owner_id, player_id').eq('grade', grade)
  const ownedBy = new Map<string, Set<string>>()
  for (const c of owned ?? []) {
    if (!ownedBy.has(c.owner_id)) ownedBy.set(c.owner_id, new Set())
    ownedBy.get(c.owner_id)!.add(c.player_id)
  }

  const cardRows: { owner_id: string; player_id: string; grade: string; source: string }[] = []
  const claimRows: { owner_id: string; grade: string; round_id: string }[] = []

  for (const owner of pending) {
    const picks = pickTwo(pool, ownedBy.get(owner) ?? new Set(), circulation)
    if (picks.length === 0) continue
    for (const p of picks) {
      cardRows.push({ owner_id: owner, player_id: p.id, grade, source: 't3' })
      // keep circulation live so a bulk deal still spreads players evenly
      circulation.set(p.id, (circulation.get(p.id) ?? 0) + 1)
    }
    claimRows.push({ owner_id: owner, grade, round_id: roundId })
  }

  if (cardRows.length === 0) return { dealt: 0, cards: 0 }

  // Insert in chunks — a large intake can be hundreds of rows
  for (let i = 0; i < cardRows.length; i += 500) {
    const { error: e } = await admin.from('cards').insert(cardRows.slice(i, i + 500))
    if (e) throw new Error('Auto-deal card insert failed: ' + e.message)
  }
  for (let i = 0; i < claimRows.length; i += 500) {
    await admin.from('t3_claims').insert(claimRows.slice(i, i + 500))
  }

  return { dealt: claimRows.length, cards: cardRows.length }
}