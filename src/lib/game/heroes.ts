/** Initial antihero kits and passives are playtest values. Both faces remain part of each physical card. */
export const heroes = {
  "oathless-seraph": {
    name: "The Oathless Seraph",
    passive: "Before each light card without a direct attack, gain 1 Ward.",
    art: "hero-oathless-seraph.webp",
    pairs: ["Angel & Vampire", "Feather & Chain", "Seraph & Fallen Seraph", "Bloom & Wither", "Key & Lock"],
  },
  "thorn-witch": {
    name: "The Thorn Witch",
    passive: "Before each dark card resolves, apply 1 Curse.",
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

/** Existing class saves retain their original passives. */
export type HeroRuleset = 2 | 3;
export function heroPassive(hero: HeroId, ruleset?: HeroRuleset): string {
  if (hero === "thorn-witch" && ruleset === undefined)
    return "Before each dark card resolves, apply 2 Poison.";
  if (hero === "oathless-seraph" && ruleset !== 3) return "Before each light card resolves, gain 1 Ward.";
  return heroes[hero].passive;
}
