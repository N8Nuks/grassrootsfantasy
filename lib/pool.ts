import type { SupabaseClient } from '@supabase/supabase-js'

/* The one rule for who is visible in the game: active, and either an adult or
   a minor with parental consent on record. Every read of `players` that reaches
   a manager — deals, the Hall, leaders, arcade games — must go through this,
   so the filter can't be forgotten on the next surface. Admin screens may
   query players directly; nothing else should. */
export const POOL_FILTER = 'is_under18.eq.false,has_consent.eq.true'

export function poolQuery(client: SupabaseClient, columns: string) {
  return client.from('players').select(columns).eq('active', true).or(POOL_FILTER)
}