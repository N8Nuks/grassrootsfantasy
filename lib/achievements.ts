import type { SupabaseClient } from '@supabase/supabase-js'

export type DoubledPlayer = { player_id: string; kind: string }

/* Which players score double in a given round number, for a grade.
   Achievements are earned in one round and apply to the next, so this reads
   `applies_round_number` rather than the round they were earned in. */
export async function doubledInRound(
  supabase: SupabaseClient,
  grade: string,
  roundNumber: number | null,
): Promise<Map<string, string>> {
  if (roundNumber == null) return new Map()
  const { data } = await supabase.from('player_achievements')
    .select('player_id, kind')
    .eq('grade', grade)
    .eq('applies_round_number', roundNumber)
  return new Map((data ?? []).map(r => [r.player_id, r.kind]))
}

export const DOUBLE_LABEL: Record<string, string> = {
  cycle: 'Cycle · 2×',
  perfect_game: 'Perfect Game · 2×',
}