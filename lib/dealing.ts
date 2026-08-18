import { SupabaseClient } from '@supabase/supabase-js'

type Player = {
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
type Grade = 'mens' | 'womens'

const TOP_2WPA: Record<Grade, string[]> = {
  mens: ['Thomas Enoka','Jack Besgrove','Floyd Nola','Traye Wildbore','Liam Twigden'],
  womens: ['Alexia Lacatena','Lauren Heijnsdijk','Kamryn Coleman','Shyah Hale','Tyneesha Houkamau'],
}

const STARTER_SLOTS = ['C','P','PB','SS','B2','B3','B1','LF','CF','RF','DP','DR']

function eligible(card: Player, slot: string): boolean {
  if (slot === 'DP' || slot === 'DR') return true
  return card.positions.includes(slot)
}

function isPurePitcher(p: Player): boolean {
  return p.positions.every(pos => pos === 'P' || pos === 'PB')
}

// Assign 12 cards to 12 starter slots. Most-constrained slot first,
// filled by the eligible card with fewest other options.
export function assignLineup(cards: Player[]): Map<string, Player> | null {
  const assigned = new Map<string, Player>()
  const remaining = [...cards]
  const slots = [...STARTER_SLOTS].sort((a, b) =>
    remaining.filter(c => eligible(c, a)).length - remaining.filter(c => eligible(c, b)).length
  )
  for (const slot of slots) {
    const candidates = remaining.filter(c => eligible(c, slot))
    if (candidates.length === 0) return null
    candidates.sort((a, b) =>
      slots.filter(s => !assigned.has(s) && eligible(a, s)).length -
      slots.filter(s => !assigned.has(s) && eligible(b, s)).length
    )
    const pick = candidates[0]
    assigned.set(slot, pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }
  return assigned
}

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}

export function dealT1(pool: Player[], grade: Grade): { cards: Player[]; lineup: Map<string, Player> } {
  const byTier = (t: string) => pool.filter(p => p.tier === t)
  const topA = TOP_2WPA[grade]
  for (let attempt = 0; attempt < 200; attempt++) {
    const flexTier = Math.random() < 0.5 ? 'elite' : 'common'
    const picks = [
      ...sample(byTier('rare_2wp_a').filter(p => topA.includes(p.full_name)), 1),
      ...sample(byTier('rare_2wp_b'), 1),
      ...sample(byTier('elite'), flexTier === 'elite' ? 6 : 5),
      ...sample(byTier('common'), flexTier === 'common' ? 5 : 4),
    ]
    if (picks.length !== 12) continue
    // Rule: at least 2 catcher-eligible
    if (picks.filter(p => p.positions.includes('C')).length < 2) continue
    // Rule: max 1 pure pitcher outside the two 2WP cards
    const nonRare = picks.filter(p => p.tier === 'elite' || p.tier === 'common')
    if (nonRare.filter(isPurePitcher).length > 1) continue
    // Rule: 12 cards must legally fill all 12 slots
    const lineup = assignLineup(picks)
    if (!lineup) continue
    return { cards: picks, lineup }
  }
  throw new Error('Could not deal a legal T1 pack after 200 attempts')
}

export async function dealAndPersistT1(admin: SupabaseClient, userId: string, grade: Grade) {
  // Guard 1 — cheap check, catches the ordinary "already registered" case.
  const { count } = await admin.from('cards').select('id', { count: 'exact', head: true })
    .eq('owner_id', userId).eq('grade', grade).eq('source', 't1')
  if (count && count > 0) throw new Error('T1 already dealt for this grade')

  // Guard 2 — claim the deal before doing any work.
  // Two requests arriving together both pass Guard 1 (neither has inserted yet),
  // which is how a user ends up with 24 T1 cards. The pre-season lineup row is
  // unique per owner+grade+round, so inserting it FIRST makes the second request
  // fail here instead of dealing a duplicate pack.
  const { data: round } = await admin.from('rounds')
    .select('id').eq('grade', grade).eq('round_number', 0).single()
  if (!round) throw new Error('Pre-season round missing')

  const { data: lineupRow, error: lineupError } = await admin.from('lineups')
    .insert({ owner_id: userId, round_id: round.id, grade }).select('id').single()
  if (lineupError || !lineupRow) {
    throw new Error('T1 already in progress or dealt for this grade')
  }

  // Under-18 players never enter the pool, whatever `active` says.
  const { data: pool, error: poolError } = await admin.from('players')
    .select('id, full_name, tier, positions, stats, photo_url, playing_number, reveal_pos, clubs(name)')
    .eq('grade', grade).eq('active', true).or('is_under18.eq.false,has_consent.eq.true')
  if (poolError || !pool || pool.length === 0) {
    // roll back the claim so the user can try again
    await admin.from('lineups').delete().eq('id', lineupRow.id)
    throw new Error('Player pool unavailable')
  }

  let cards: Player[]
  let lineup: Map<string, Player>
  try {
    const dealt = dealT1(pool as unknown as Player[], grade)
    cards = dealt.cards
    lineup = dealt.lineup
  } catch (e) {
    await admin.from('lineups').delete().eq('id', lineupRow.id)
    throw e
  }

  const { data: inserted, error: cardError } = await admin.from('cards')
    .insert(cards.map(p => ({ owner_id: userId, player_id: p.id, grade, source: 't1' })))
    .select('id, player_id')
  if (cardError || !inserted) {
    await admin.from('lineups').delete().eq('id', lineupRow.id)
    throw new Error('Card insert failed: ' + cardError?.message)
  }

  const cardIdByPlayer = new Map(inserted.map(c => [c.player_id, c.id]))
  const slotRows = [...lineup.entries()].map(([slot, player]) => ({
    lineup_id: lineupRow.id, slot, card_id: cardIdByPlayer.get(player.id),
  }))
  const { error: slotError } = await admin.from('lineup_slots').insert(slotRows)
  if (slotError) throw new Error('Slot insert failed: ' + slotError.message)

  // Sensible armband defaults so a manager who never sets them still gets the
  // multipliers. P and C because at season start there's no form to sort on —
  // predictable and easy to explain. Changeable from My Team any time.
  const captainPlayer = lineup.get('P')
  const vicePlayer = lineup.get('C')
  const captainCard = captainPlayer ? cardIdByPlayer.get(captainPlayer.id) ?? null : null
  const viceCard = vicePlayer ? cardIdByPlayer.get(vicePlayer.id) ?? null : null
  if (captainCard || viceCard) {
    await admin.from('lineups')
      .update({ captain_card_id: captainCard, vice_captain_card_id: viceCard })
      .eq('id', lineupRow.id)
  }

  return {
    dealt: cards.length,
    cards: cards.map(p => ({
      name: p.full_name,
      tier: p.tier,
      positions: p.positions,
      club: p.clubs?.name ?? '',
      stats: p.stats ?? {},
      photoUrl: p.photo_url ?? null,
      playingNumber: p.playing_number ?? null,
      revealPos: p.reveal_pos ?? null,
    })),
  }
}