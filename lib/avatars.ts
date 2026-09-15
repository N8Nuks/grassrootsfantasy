/* Figure avatar gallery — one finished image per entry, no layering.
   Add a file to public/avatars/ and a line here; nothing else changes. */
export const AVATAR_IMAGES = [
  'batter-red-chalk.png', 'batter-blue-lights.png', 'batter-green-grass.png', 'batter-purple-halo.png', 'batter-gold-sunset.png',
  'batter-male-teal-halo.png',
  'batter-12-green-chalk.png', 'batter-12-navy-lights.png', 'batter-12-purple-halo.png', 'batter-12-red-bands.png',
  'batter-17-blue-halo.png', 'batter-17-maroon.png', 'batter-17-sand-chalk.png', 'batter-17-slate-lights.png',
  'batter-24-blue-lights.png', 'batter-24-gold-sunset.png', 'batter-24-green-grass.png', 'batter-24-red-chalk.png',
  'batter-ramblers-charcoal-halo.png', 'batter-ramblers-gold-chalk.png', 'batter-ramblers-maroon-lights.png', 'batter-ramblers-teal-grass.png',
  'pitcher-red-dirt.png', 'pitcher-blue-bands.png', 'pitcher-maroon-lights.png', 'pitcher-sand-chalk.png', 'pitcher-slate-halo.png',
  'catcher-red-halo.png', 'catcher-blue-dirt.png', 'catcher-green-chalk.png', 'catcher-gold-bands.png', 'catcher-purple-lights.png',
  'fielder-red-grass.png', 'fielder-blue-sunset.png', 'fielder-maroon-dirt.png', 'fielder-sand-lights.png', 'fielder-slate-chalk.png',
  'fielder-male-charcoal-chalk.png', 'fielder-male-crimson-bands.png', 'fielder-male-navy-dirt.png', 'fielder-male-teal-sunset.png',
  'slide-red-lights.png', 'slide-blue-halo.png', 'slide-green-dirt.png', 'slide-gold-chalk.png',
] as const

export const isAvatarImage = (s: unknown): s is string =>
  typeof s === 'string' && (AVATAR_IMAGES as readonly string[]).includes(s)

// "batter-12-red-bands.png" → "Batter 12 · red bands"
export const avatarLabel = (file: string) => {
  const parts = file.replace(/\.png$/, '').split('-')
  const figure = parts.shift() ?? ''
  const num = /^\d+$/.test(parts[0]) ? parts.shift() : null
  return `${figure[0].toUpperCase()}${figure.slice(1)}${num ? ' ' + num : ''} · ${parts.join(' ')}`
}