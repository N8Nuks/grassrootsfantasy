/* Team-name filter. Two lists:
   - BLOCKED_WORDS: only block as a whole word, because they sit inside
     ordinary words ("cunt" in "country", "ass" in "class"). Hyphens, spaces
     and digits count as word breaks, so "Cunt-ry" is caught and "Country" is not.
   - BLOCKED_ANYWHERE: slurs with no innocent use; block if they appear at all,
     even run together with other letters.
   Leetspeak is folded first (0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s, !→i). */

const BLOCKED_WORDS = [
  'cunt', 'cunts', 'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking',
  'shit', 'shits', 'shitty', 'bitch', 'bitches', 'cock', 'cocks', 'dick', 'dicks',
  'pussy', 'pussies', 'twat', 'twats', 'wanker', 'wankers', 'arse', 'arsehole',
  'ass', 'asshole', 'assholes', 'slut', 'sluts', 'whore', 'whores', 'rape', 'rapist',
  'nazi', 'nazis', 'hitler', 'paedo', 'pedo', 'molester',
]

const BLOCKED_ANYWHERE = [
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'spastic', 'kike', 'chink',
  'gook', 'wetback', 'tranny', 'coon',
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
  const joined = tokens.join('')

  if (tokens.some(t => BLOCKED_WORDS.includes(t))) return 'That name isn\'t allowed.'
  if (BLOCKED_ANYWHERE.some(w => joined.includes(w))) return 'That name isn\'t allowed.'
  return null
}