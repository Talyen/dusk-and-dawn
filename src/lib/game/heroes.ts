/** Initial antihero kits and passives are playtest values. Both faces remain part of each physical card. */
export const heroes = {
  "oathless-seraph": {
    name: "The Oathless Seraph",
    passive: "Before each light card resolves, gain 1 Ward.",
    art: "hero-oathless-seraph.webp",
    pairs: ["Angel & Vampire", "Sun & Moon", "Seraph & Fallen Seraph", "Bloom & Wither", "Key & Lock"],
  },
  "thorn-witch": {
    name: "The Thorn Witch",
    passive: "Before each dark card resolves, apply 2 Poison.",
    art: "hero-thorn-witch.webp",
    pairs: ["Angel & Vampire", "Sun & Moon", "Ivy & Thorns", "Bloom & Wither", "Key & Lock"],
  },
  "veiled-oracle": {
    name: "The Veiled Oracle",
    passive: "Scry at the start of each turn.",
    art: "hero-veiled-oracle.webp",
    pairs: ["Angel & Vampire", "Sun & Moon", "Bloom & Wither", "Key & Lock", "Oracle & Deceiver"],
  },
} as const;
export type HeroId = keyof typeof heroes;
export const heroIds = [
  "oathless-seraph",
  "thorn-witch",
  "veiled-oracle",
] as const satisfies readonly HeroId[];
