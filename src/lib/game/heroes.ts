/** Initial antihero kits and passives are playtest values. Both faces remain part of each physical card. */
export const heroes = {
  "oathless-seraph": {
    name: "The Oathless Seraph",
    passive: "Before each light card without a direct attack, gain 1 Ward.",
    art: "hero-oathless-seraph.webp",
    signature: "Benediction & Curse",
    pairs: ["Angel & Vampire", "Feather & Chain", "Seraph & Fallen Seraph", "Bloom & Wither", "Key & Lock"],
  },
  "thorn-witch": {
    name: "The Thorn Witch",
    passive: "Before each dark attack card, apply 1 Curse.",
    art: "hero-thorn-witch.webp",
    signature: "Censer & Plague Brazier",
    pairs: ["Angel & Vampire", "Sun & Moon", "Ivy & Thorns", "Bloom & Wither", "Key & Lock"],
  },
  "veiled-oracle": {
    name: "The Veiled Oracle",
    passive: "Scry at the start of each turn.",
    art: "hero-veiled-oracle.webp",
    signature: "Candle & Extinguished Candle",
    pairs: ["Angel & Vampire", "Sun & Moon", "Bloom & Wither", "Key & Lock", "Oracle & Deceiver"],
  },
} as const;
export type HeroId = keyof typeof heroes;
export const heroIds = [
  "oathless-seraph",
  "thorn-witch",
  "veiled-oracle",
] as const satisfies readonly HeroId[];

/** Starter compositions affect new runs only; existing runs store their own decks. */
export function heroStartingPairs(hero: HeroId): string[] {
  const choice = heroes[hero];
  return [
    ...choice.pairs.flatMap((pair) => (pair === "Angel & Vampire" ? [pair] : [pair, pair])),
    choice.signature,
  ];
}
export function heroDeckDescription(hero: HeroId): string {
  const choice = heroes[hero];
  const doubled = choice.pairs.filter((pair) => pair !== "Angel & Vampire");
  return `one each of Angel & Vampire and ${choice.signature}; two each of ${doubled.join(", ")}.`;
}

/** Existing class saves retain their original passives. */
export type HeroRuleset = 2 | 3 | 4;
export function heroPassive(hero: HeroId, ruleset?: HeroRuleset): string {
  if (hero === "thorn-witch" && ruleset === undefined)
    return "Before each dark card resolves, apply 2 Poison.";
  if (hero === "thorn-witch" && (ruleset === 2 || ruleset === 3))
    return "Before each dark card resolves, apply 1 Curse.";
  if (hero === "oathless-seraph" && (ruleset === undefined || ruleset === 2))
    return "Before each light card resolves, gain 1 Ward.";
  return heroes[hero].passive;
}
