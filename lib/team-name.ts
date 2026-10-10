/* Team-name filter.
   - WORD_ONLY: block as a whole word, because the word also sits inside
     ordinary words ("ass" in "class", "cock" in "cockpit", "rape" in "grape",
     "coon" in "raccoon", "dick" in "Dickens"). Hyphens, spaces and digits
     count as word breaks.
   - ANYWHERE: no safe word contains these, so they're blocked even glued to
     other letters or run together with no separator at all ("yofuck").
   Leetspeak is folded first (0->o, 1->i, 3->e, 4->a, 5->s, @->a, $->s, !->i). */

const WORD_ONLY = [
  'ass', 'asshole', 'assholes', 'cock', 'cocks', 'dick', 'dicks', 'twat', 'twats',
  'rape', 'rapist', 'fag', 'coon', 'retard', 'spastic', 'arse', 'arsehole',
]

const ANYWHERE = [
  'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking',
  'shit', 'shits', 'shitty', 'cunt', 'cunts', 'bitch', 'bitches',
  'pussy', 'pussies', 'wanker', 'wankers', 'slut', 'sluts', 'whore', 'whores',
  'nazi', 'nazis', 'hitler', 'paedo', 'pedo', 'molester', 'faggot',
  'nigger', 'nigga', 'kike', 'chink', 'gook', 'wetback', 'tranny',
]

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' }

function fold(s: string) {
  return s.toLowerCase().replace(/[013457@$!]/g, c => LEET[c] ?? c)
}

/** Returns null if the name is fine, or a short reason if it isn't. */
export function teamNameProblem(raw: string): string | null {
  const name = raw.trim()
  if (name.length < 3) return 'Team names need at least 3 characters.'
  if (name.length > 30) return 'Team names can be up to 30 characters.'
  if (!/^[A-Za-z0-9 '\-.&!]+$/.test(name)) return 'Use letters, numbers, spaces, apostrophes, hyphens, dots, & or !'

  const folded = fold(name)
  const tokens = folded.split(/[^a-z]+/).filter(Boolean)
  const compact = folded.replace(/[^a-z]/g, '')

  if (tokens.some(t => WORD_ONLY.includes(t))) return 'That name isn\'t allowed.'
  if (ANYWHERE.some(w => compact.includes(w))) return 'That name isn\'t allowed.'
  return null
}