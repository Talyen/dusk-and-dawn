import { rngInt, shuffle, type Rng } from "../random";

export type Face = "light" | "dark";
export interface FightCard {
  id: string;
  pair: string;
  face: Face;
  kept: boolean;
}

/** Pile tops are at the end of their arrays. Cards retain their faces when moved. */
export interface CardZones {
  library: FightCard[];
  hand: FightCard[];
  discard: FightCard[];
  banished: FightCard[];
  scry: boolean;
}

export const HAND_LIMIT = 8;

function refillLibrary(zones: CardZones, rng: Rng): void {
  if (zones.library.length === 0 && zones.discard.length > 0) {
    zones.library = shuffle(zones.discard, rng);
    zones.discard = [];
  }
}

/** Excess draws remain in the library. Reshuffle only as needed for each draw. */
export function drawCards(zones: CardZones, count: number, rng: Rng): number {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid draw count");
  let drawn = 0;
  while (drawn < count && zones.hand.length < HAND_LIMIT) {
    refillLibrary(zones, rng);
    const card = zones.library.pop();
    if (!card) break;
    card.kept = false;
    zones.hand.push(card);
    drawn += 1;
  }
  return drawn;
}

/** Scry does not cause a reshuffle and follows the current library top. */
export function scryTop(zones: CardZones): FightCard | null {
  return zones.scry ? (zones.library.at(-1) ?? null) : null;
}

/** Left-to-right discard makes the rightmost discarded card the new top. */
export function discardAtEndTurn(zones: CardZones): void {
  zones.scry = false;
  const remaining: FightCard[] = [];
  for (const card of zones.hand) {
    if (card.kept) remaining.push(card);
    else zones.discard.push(card);
    card.kept = false;
  }
  zones.hand = remaining;
}

function randomCards(pool: readonly FightCard[], count: number, rng: Rng): FightCard[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid target count");
  const available = [...pool];
  const picked: FightCard[] = [];
  while (picked.length < count && available.length) {
    picked.push(available.splice(rngInt(rng, available.length), 1)[0]!);
  }
  return picked;
}

export type AutomaticTarget =
  | { kind: "source" }
  | { kind: "hand" }
  | { kind: "random-hand"; count: number }
  | { kind: "top-discard" };

/** The source must already be outside the hand while its effect resolves. */
function targets(zones: CardZones, source: FightCard, target: AutomaticTarget, rng: Rng): FightCard[] {
  if (zones.hand.includes(source)) throw new Error("Resolving source must be outside the hand");
  switch (target.kind) {
    case "source":
      return [source];
    case "hand":
      return [...zones.hand];
    case "random-hand":
      return randomCards(zones.hand, target.count, rng);
    case "top-discard":
      return zones.discard.length ? [zones.discard.at(-1)!] : [];
  }
}

/** Flip resolves after payment. The caller continues the originally played effect. */
export function flipCards(
  zones: CardZones,
  source: FightCard,
  target: AutomaticTarget,
  rng: Rng,
): FightCard[] {
  const chosen = targets(zones, source, target, rng);
  for (const card of chosen) card.face = card.face === "light" ? "dark" : "light";
  return chosen;
}

export function keepCards(
  zones: CardZones,
  source: FightCard,
  target: Exclude<AutomaticTarget, { kind: "top-discard" }>,
  rng: Rng,
): FightCard[] {
  const chosen = targets(zones, source, target, rng);
  for (const card of chosen) card.kept = true;
  return chosen;
}

/** Finish resolving a source not Banished by its effect. */
export function finishSource(zones: CardZones, source: FightCard): void {
  if (source.kept && zones.hand.length < HAND_LIMIT) zones.hand.push(source);
  else {
    source.kept = false;
    zones.discard.push(source);
  }
}
