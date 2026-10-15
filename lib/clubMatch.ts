/* Fixture rows carry club names as free text ("United-Marist") while the
   clubs table says "Marist United". Matching on the sorted words makes order,
   hyphens and case irrelevant. A fixture with a missing side (team text "BYE",
   club empty) is a bye row: the named club is NOT playing that round. */

export function clubKey(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean).sort().join(' ')
}

type FixtureSides = { club_a: string | null; club_b: string | null }

/* Keys of every club with a real game in the given fixtures. Bye rows and
   half-filled rows contribute nothing, so their club falls out as "not playing". */
export function playingKeys(fixtures: FixtureSides[]): Set<string> {
  const playing = new Set<string>()
  for (const f of fixtures) {
    if (f.club_a && f.club_b) {
      playing.add(clubKey(f.club_a))
      playing.add(clubKey(f.club_b))
    }
  }
  return playing
}