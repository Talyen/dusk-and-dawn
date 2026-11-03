import { simpleCards } from "./simple-cards.generated";
import { rngInt, shuffle, type Rng } from "../random";
import { createSession, restoreSession, type Handler } from "./session";
import {
  applyDamageOverTime,
  halveWard,
  resolveDamageOverTime,
  removeStatuses,
  type Combatant,
  type DamageType,
} from "./combat-status";
import { directAttack } from "./direct-attack";
import {
  discardAtEndTurn,
  drawCards,
  finishSource,
  flipCards,
  keepCards,
  type CardZones,
  type FightCard,
} from "./card-zones";

type Pair = string;
type SimpleOp =
  | (typeof simpleCards)[keyof typeof simpleCards]["light"]["ops"][number]
  | (typeof simpleCards)[keyof typeof simpleCards]["dark"]["ops"][number];
interface FaceInfo {
  name: string;
  effect: string;
  keywords: readonly string[];
  ops?: readonly SimpleOp[];
}
export const cards: Record<Pair, { light: FaceInfo; dark: FaceInfo }> = {
  ...simpleCards,
  "Angel & Vampire": {
    light: { name: "Angel", effect: "Gain 5 Ward.", keywords: ["Ward"] },
    dark: { name: "Vampire", effect: "Deal 4 Shadow damage. Leech.", keywords: ["Shadow", "Leech"] },
  },
  "Sun & Moon": {
    light: { name: "Sun", effect: "Deal 6 Radiance damage.", keywords: ["Radiance"] },
    dark: { name: "Moon", effect: "Flip your hand.", keywords: ["Flip"] },
  },
  "Bloom & Wither": {
    light: { name: "Bloom", effect: "Heal 4 HP. Banish this card.", keywords: ["Banish"] },
    dark: { name: "Wither", effect: "Deal 7 Decay damage. Banish this card.", keywords: ["Decay", "Banish"] },
  },
  "Flame & Frost": {
    light: { name: "Flame", effect: "Apply 3 Burn.", keywords: ["Burn"] },
    dark: { name: "Frost", effect: "Curse 2.", keywords: ["Curse"] },
  },
  "Key & Lock": {
    light: { name: "Key", effect: "Draw 1 card. Flip your hand.", keywords: ["Flip"] },
    dark: { name: "Lock", effect: "Keep this card.", keywords: ["Keep"] },
  },
  "Ivy & Thorns": {
    light: { name: "Ivy", effect: "Curse 2.", keywords: ["Curse"] },
    dark: { name: "Thorns", effect: "Deal 2 Decay damage twice.", keywords: ["Decay"] },
  },
  "Mirror & Shattered Mirror": {
    light: {
      name: "Mirror",
      effect: "Reflect the first hit of the enemy's next attack. Banish this card.",
      keywords: ["Reflect", "Banish"],
    },
    dark: { name: "Shattered Mirror", effect: "Deal 2 Release damage twice.", keywords: ["Release"] },
  },
  "Candle & Extinguished Candle": {
    light: {
      name: "Candle",
      effect: "Gain 1 mana. Apply 2 Burn. Banish this card.",
      keywords: ["Burn", "Banish"],
    },
    dark: {
      name: "Extinguished Candle",
      effect: "Turn your hand to its dark faces. Banish this card.",
      keywords: ["Banish"],
    },
  },
  "Seed & Ash": {
    light: {
      name: "Seed",
      effect: "Put the bottom 2 cards of your discard pile on the bottom of your library.",
      keywords: [],
    },
    dark: {
      name: "Ash",
      effect: "Deal 7 Decay damage. Banish this card.",
      keywords: ["Decay", "Banish"],
    },
  },
  "Lantern & Shroud": {
    light: { name: "Lantern", effect: "Scry. Draw 1 card.", keywords: ["Scry"] },
    dark: { name: "Shroud", effect: "Keep your hand.", keywords: ["Keep"] },
  },
  "Feather & Chain": {
    light: { name: "Feather", effect: "Draw 2 cards.", keywords: [] },
    dark: { name: "Chain", effect: "Curse 2.", keywords: ["Curse"] },
  },
  "Silence & Clamor": {
    light: { name: "Silence", effect: "Hush. Banish this card.", keywords: ["Hush", "Banish"] },
    dark: { name: "Clamor", effect: "Curse 2.", keywords: ["Curse"] },
  },
  "Ice Crystal & Salt Crystal": {
    light: { name: "Ice Crystal", effect: "Freeze. Banish this card.", keywords: ["Freeze", "Banish"] },
    dark: { name: "Salt Crystal", effect: "Keep this card.", keywords: ["Keep"] },
  },
  "Memory & Oblivion": {
    light: {
      name: "Memory",
      effect: "Return a card of your choice from your discard pile to your hand. Banish this card.",
      keywords: ["Banish"],
    },
    dark: {
      name: "Oblivion",
      effect: "Deal 7 Oblivion damage. Banish this card.",
      keywords: ["Oblivion", "Banish"],
    },
  },
};
const starter: Pair[] = ["Angel & Vampire", "Sun & Moon", "Bloom & Wither", "Flame & Frost", "Key & Lock"];
const rewards: Pair[] = [
  ...new Set([
    ...Object.keys(simpleCards),
    "Seed & Ash",
    "Lantern & Shroud",
    "Memory & Oblivion",
    "Silence & Clamor",
    "Ice Crystal & Salt Crystal",
  ]),
].filter((pair) => !starter.includes(pair));

interface Action {
  name: string;
  text: string;
  hit?: number;
  type?: DamageType;
  extra?: number;
  traitBonus?: number;
  ability?: "curse" | "heal" | "banish";
  rider?: "curse" | "poison";
}
interface Enemy {
  name: string;
  hp: number;
  weakness: DamageType;
  trait: string;
  traitEffect: string;
  actions: Action[];
}
export const route: readonly Enemy[] = [
  {
    name: "Radiant Moth",
    hp: 18,
    weakness: "Shadow",
    trait: "Open Wings",
    traitEffect: "On Open-Wing Dust: add 1 Radiance damage to the base hit.",
    actions: [
      { name: "Folded-Wing Dust", text: "Deal 4 Radiance damage.", hit: 4, type: "Radiance" },
      {
        name: "Open-Wing Dust",
        text: "Deal 5 Radiance damage (including Open Wings).",
        hit: 4,
        traitBonus: 1,
        type: "Radiance",
      },
    ],
  },
  {
    name: "Glass Judge",
    hp: 24,
    weakness: "Shadow",
    trait: "Split Verdict",
    traitEffect: "On Prismatic Sentence: add a hit of 2 Radiance damage.",
    actions: [
      { name: "Weigh the Accused", text: "Apply 1 Curse to you.", ability: "curse" },
      { name: "Glass Hand", text: "Deal 4 Radiance damage.", hit: 4, type: "Radiance" },
      {
        name: "Prismatic Sentence",
        text: "Deal 5 Radiance damage, then 2 Radiance damage (Split Verdict).",
        hit: 5,
        type: "Radiance",
        extra: 2,
      },
    ],
  },
  {
    name: "Velvet Widow",
    hp: 30,
    weakness: "Radiance",
    trait: "Widow Venom",
    traitEffect: "On Venomous Lunge: apply 3 Poison to the player.",
    actions: [
      { name: "Velvet Fang", text: "Deal 5 Shadow damage.", hit: 5, type: "Shadow" },
      {
        name: "Venomous Lunge",
        text: "Deal 5 Shadow damage. Apply 3 Poison (Widow Venom).",
        hit: 5,
        type: "Shadow",
        rider: "poison",
      },
    ],
  },
  {
    name: "Mourning Tree",
    hp: 36,
    weakness: "Decay",
    trait: "Root Snare",
    traitEffect: "On Root Lash: apply 1 Curse to the player.",
    actions: [
      { name: "Draw from the Earth", text: "Heal 3 HP.", ability: "heal" },
      {
        name: "Root Lash",
        text: "Deal 7 Growth damage. Apply 1 Curse (Root Snare).",
        hit: 7,
        type: "Growth",
        rider: "curse",
      },
    ],
  },
  {
    name: "Hollow King",
    hp: 48,
    weakness: "Radiance",
    trait: "Empty Grasp",
    traitEffect: "On Hollow Clutch: apply 1 Curse to the player.",
    actions: [
      { name: "Royal Reach", text: "Deal 6 Shadow damage.", hit: 6, type: "Shadow" },
      { name: "Empty Decree", text: "Banish the top card of your library.", ability: "banish" },
      {
        name: "Hollow Clutch",
        text: "Deal 7 Shadow damage. Apply 1 Curse (Empty Grasp).",
        hit: 7,
        type: "Shadow",
        rider: "curse",
      },
    ],
  },
];
interface DeckCard {
  id: string;
  pair: Pair;
}
export interface RunState {
  phase: "battle" | "reward" | "rest" | "victory" | "defeat";
  fight: number;
  deck: DeckCard[];
  nextId: number;
  player: Combatant;
  enemy: Combatant;
  zones: CardZones;
  mana: number;
  action: number;
  offers: Pair[];
  message: string;
}
export type Command =
  | { type: "play"; id: string; targets?: string[] }
  | { type: "end" }
  | { type: "reward"; pair: Pair | null }
  | { type: "rest"; remove?: string }
  | { type: "concede" };
const combatant = (hp: number): Combatant => ({
  hp,
  maxHp: hp,
  ward: 0,
  burn: 0,
  poison: 0,
  bless: 0,
  curse: 0,
  reflect: false,
  hush: false,
  freeze: false,
  nextDrawPenalty: 0,
  nextManaPenalty: 0,
});
const emptyZones = (): CardZones => ({ library: [], hand: [], discard: [], banished: [], scry: false });
const yes = () => ({ accepted: true as const, effects: [] as string[] });
const no = (reason: string) => ({ accepted: false as const, reason });
export function face(card: FightCard): FaceInfo {
  const pair = cards[card.pair];
  if (!pair) throw new Error(`Unknown card pair: ${card.pair}`);
  return pair[card.face];
}
function beginFight(s: RunState, rng: Rng) {
  const hp = s.player.hp;
  s.player = combatant(30);
  s.player.hp = hp;
  s.enemy = combatant(route[s.fight]!.hp);
  s.action = 0;
  s.mana = 3;
  s.zones = emptyZones();
  s.zones.library = shuffle(
    s.deck.map((c) => ({ ...c, face: "light" as const, kept: false })),
    rng,
  );
  drawCards(s.zones, 5, rng);
  s.phase = "battle";
  s.message = `Fight ${s.fight + 1}: ${route[s.fight]!.name}`;
}
function victory(s: RunState, rng: Rng) {
  if (s.fight === route.length - 1) {
    s.phase = "victory";
    s.message = "The Hollow King falls.";
    return;
  }
  const owned = new Set(s.deck.map((c) => c.pair));
  s.offers = shuffle(
    rewards.filter((p) => !owned.has(p)),
    rng,
  ).slice(0, 3);
  s.phase = "reward";
  s.message = "Choose a card pair or skip.";
}
function attack(s: RunState, hits: number[], type: DamageType, leech = false) {
  directAttack(
    s.player,
    s.enemy,
    hits.map((amount) => ({ amount, type })),
    { weakness: route[s.fight]!.weakness, leech, scaling: "flat-preview" },
  );
}
/** The trait's contribution can be suppressed without suppressing a base attack. */
export function enemyAttackHits(action: Action, hush: boolean): number[] {
  if (action.hit === undefined) return [];
  return [
    action.hit + (hush ? 0 : (action.traitBonus ?? 0)),
    ...(!hush && action.extra !== undefined ? [action.extra] : []),
  ];
}
/** Visible preflight checks never consume mana or reveal random outcomes. */
export function cardRestriction(s: RunState, source: FightCard): string {
  const info = face(source);
  const ops = info.ops ?? [];
  const action = route[s.fight]!.actions[s.action]!;
  if (
    (info.name === "Silence" || ops.some((op) => op.op === "hush")) &&
    (s.enemy.hush || !(action.ability || action.traitBonus || action.extra || action.rider))
  )
    return "Hush requires an unsuppressed ability or trait in the next intent.";
  if ((info.name === "Ice Crystal" || ops.some((op) => op.op === "freeze")) && s.enemy.freeze)
    return "The enemy is already Frozen.";
  const loss = ops.find((op) => op.op === "lose-hp");
  if (loss && s.player.hp <= loss.amount) return "Not enough HP to pay this cost.";
  const first = ops[0];
  if (first && ops.slice(1).some((op) => op.op !== "banish")) {
    if (first.op === "discard-random" && s.zones.hand.length <= 1)
      return "Another card in hand is required as payment.";
    if (first.op === "banish-discard" && !s.zones.discard.length)
      return "A card in the discard pile is required as payment.";
  }
  return "";
}
function findTargets(list: FightCard[], ids: string[]): FightCard[] | null {
  if (new Set(ids).size !== ids.length) return null;
  const result = ids.map((id) => list.find((c) => c.id === id));
  return result.every(Boolean) ? (result as FightCard[]) : null;
}
export const runHandler: Handler<RunState, Command, string> = (s, command, rng) => {
  if (command.type === "concede") {
    if (s.phase !== "battle") return no("No battle to concede.");
    s.phase = "defeat";
    s.message = "Run conceded.";
    return yes();
  }
  if (command.type === "reward") {
    if (s.phase !== "reward" || (command.pair !== null && !s.offers.includes(command.pair)))
      return no("Invalid reward.");
    if (command.pair) s.deck.push({ id: `card-${s.nextId++}`, pair: command.pair });
    s.offers = [];
    if (s.fight === 1) {
      s.phase = "rest";
      s.message = "Heal 6 HP or remove one card.";
    } else {
      s.fight++;
      beginFight(s, rng);
    }
    return yes();
  }
  if (command.type === "rest") {
    if (s.phase !== "rest") return no("No rest available.");
    if (command.remove !== undefined) {
      const i = s.deck.findIndex((c) => c.id === command.remove);
      if (i < 0) return no("Choose a card in the deck.");
      s.deck.splice(i, 1);
    } else s.player.hp = Math.min(s.player.maxHp, s.player.hp + 6);
    s.fight++;
    beginFight(s, rng);
    return yes();
  }
  if (s.phase !== "battle") return no("No active battle.");
  if (command.type === "end") {
    discardAtEndTurn(s.zones);
    resolveDamageOverTime(s.player, s.enemy);
    if (s.player.hp === 0) {
      s.phase = "defeat";
      s.message = "You fell.";
      return yes();
    }
    if (s.enemy.hp === 0) {
      victory(s, rng);
      return yes();
    }
    halveWard(s.enemy);
    const a = route[s.fight]!.actions[s.action]!;
    const suppressed = s.enemy.hush;
    const skipped = s.enemy.freeze || (suppressed && a.ability !== undefined);
    if (!skipped && a.hit !== undefined && a.type) {
      directAttack(
        s.enemy,
        s.player,
        enemyAttackHits(a, suppressed).map((amount) => ({ amount, type: a.type! })),
        { leech: false, scaling: "flat-preview" },
      );
    }
    if (s.player.hp === 0) {
      s.phase = "defeat";
      s.message = `${a.name} defeated you.`;
      return yes();
    }
    if (s.enemy.hp === 0) {
      victory(s, rng);
      return yes();
    }
    if (!skipped && (a.ability === "curse" || (!suppressed && a.rider === "curse"))) s.player.curse++;
    if (!skipped && a.ability === "heal") s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + 3);
    if (!skipped && !suppressed && a.rider === "poison") applyDamageOverTime(s.player, "poison", 3);
    if (!skipped && a.ability === "banish") {
      if (!s.zones.library.length && s.zones.discard.length) {
        s.zones.library = shuffle(s.zones.discard, rng);
        s.zones.discard = [];
      }
      const top = s.zones.library.pop();
      if (top) s.zones.banished.push(top);
    }
    if (s.enemy.hp === 0) {
      victory(s, rng);
      return yes();
    }
    s.enemy.hush = false;
    if (s.enemy.freeze) s.enemy.freeze = false;
    s.action = (s.action + 1) % route[s.fight]!.actions.length;
    halveWard(s.player);
    s.mana = Math.max(0, 3 - s.player.nextManaPenalty);
    const drawCount = Math.max(0, 5 - s.player.nextDrawPenalty);
    s.player.nextManaPenalty = 0;
    s.player.nextDrawPenalty = 0;
    drawCards(s.zones, drawCount, rng);
    s.message = skipped ? `${a.name} skipped.` : `${a.name} resolved.`;
    return yes();
  }
  const index = s.zones.hand.findIndex((c) => c.id === command.id);
  const source = s.zones.hand[index];
  if (!source || s.mana < 1) return no("Card unavailable or insufficient mana.");
  const name = face(source).name;
  const restriction = cardRestriction(s, source);
  if (restriction) return no(restriction);
  const ids = command.targets ?? [];
  if (name === "Memory") {
    if (
      (s.zones.discard.length > 0 && (ids.length !== 1 || !findTargets(s.zones.discard, ids))) ||
      (s.zones.discard.length === 0 && ids.length !== 0)
    )
      return no("Choose a card in your discard pile.");
  } else if (ids.length) return no("This card takes no targets.");
  s.zones.hand.splice(index, 1);
  source.kept = false;
  s.mana--;
  let banishSource = false;
  switch (name) {
    case "Angel":
      s.player.ward += 5;
      break;
    case "Vampire":
      attack(s, [4], "Shadow", true);
      break;
    case "Sun":
      attack(s, [6], "Radiance");
      break;
    case "Moon":
      flipCards(s.zones, source, { kind: "hand" }, rng);
      break;
    case "Bloom":
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + 4);
      break;
    case "Wither":
      attack(s, [7], "Decay");
      break;
    case "Flame":
      applyDamageOverTime(s.enemy, "burn", 3);
      break;
    case "Frost":
    case "Ivy":
    case "Chain":
    case "Clamor":
      s.enemy.curse += 2;
      break;
    case "Key":
      drawCards(s.zones, 1, rng);
      flipCards(s.zones, source, { kind: "hand" }, rng);
      break;
    case "Lock":
    case "Salt Crystal":
      keepCards(s.zones, source, { kind: "source" }, rng);
      break;
    case "Thorns":
      attack(s, [2, 2], "Decay");
      break;
    case "Silence":
      s.enemy.hush = true;
      break;
    case "Ice Crystal":
      s.enemy.freeze = true;
      break;
    case "Mirror":
      s.player.reflect = true;
      break;
    case "Shattered Mirror":
      attack(s, [2, 2], "Release");
      break;
    case "Candle":
      s.mana = Math.min(3, s.mana + 1);
      applyDamageOverTime(s.enemy, "burn", 2);
      break;
    case "Extinguished Candle":
      for (const card of s.zones.hand) card.face = "dark";
      break;
    case "Lantern":
      s.zones.scry = true;
      drawCards(s.zones, 1, rng);
      break;
    case "Shroud":
      keepCards(s.zones, source, { kind: "hand" }, rng);
      break;
    case "Feather":
      drawCards(s.zones, 2, rng);
      break;
    case "Ash":
    case "Oblivion":
      attack(s, [7], name === "Ash" ? "Decay" : "Oblivion");
      break;
    case "Memory": {
      if (ids.length) {
        const i = s.zones.discard.findIndex((c) => c.id === ids[0]);
        s.zones.hand.push(s.zones.discard.splice(i, 1)[0]!);
      }
      break;
    }
    case "Seed":
      s.zones.library.unshift(...s.zones.discard.splice(0, 2));
      break;
    default:
      for (const op of face(source).ops ?? []) {
        switch (op.op) {
          case "banish-discard": {
            const card = op.position === "top" ? s.zones.discard.pop() : s.zones.discard.shift();
            if (card) {
              card.kept = false;
              s.zones.banished.push(card);
            }
            break;
          }
          case "return-discard": {
            if (s.zones.hand.length < 8) {
              const card = op.position === "top" ? s.zones.discard.pop() : s.zones.discard.shift();
              if (card) s.zones.hand.push(card);
            }
            break;
          }
          case "flip-random":
            flipCards(s.zones, source, { kind: "random-hand", count: op.count }, rng);
            break;
          case "flip-self":
            flipCards(s.zones, source, { kind: "source" }, rng);
            break;
          case "discard-random": {
            if (s.zones.hand.length) {
              const [card] = s.zones.hand.splice(rngInt(rng, s.zones.hand.length), 1);
              card!.kept = false;
              s.zones.discard.push(card!);
            }
            break;
          }
          case "keep-random":
            keepCards(s.zones, source, { kind: "random-hand", count: op.count }, rng);
            break;
          case "remove-status":
            s.player[op.status] = 0;
            break;
          case "remove-burn-both":
            s.player.burn = 0;
            s.enemy.burn = 0;
            break;
          case "cleanse-all":
            removeStatuses(s.player, "cleanse", "all", rng);
            break;
          case "cleanse-one":
            removeStatuses(s.player, "cleanse", "one-random", rng);
            break;
          case "purge-all":
            removeStatuses(s.enemy, "purge", "all", rng);
            break;
          case "purge-one":
            removeStatuses(s.enemy, "purge", "one-random", rng);
            break;
          case "lose-hp":
            s.player.hp -= op.amount;
            break;
          case "remove-ward":
            s.enemy.ward = Math.max(0, s.enemy.ward - op.amount);
            break;
          case "hush":
            s.enemy.hush = true;
            break;
          case "freeze":
            s.enemy.freeze = true;
            break;
          case "banish":
            banishSource = true;
            break;
          case "draw":
            drawCards(s.zones, op.amount, rng);
            break;
          case "curse":
            s.enemy.curse += op.amount;
            break;
          case "bless":
            s.player.bless += op.amount;
            break;
          case "heal":
            s.player.hp = Math.min(s.player.maxHp, s.player.hp + op.amount);
            break;
          case "ward":
            s.player.ward += op.amount;
            break;
          case "mana":
            s.mana = Math.min(3, s.mana + op.amount);
            break;
          case "burn":
          case "poison":
            applyDamageOverTime(s.enemy, op.op, op.amount);
            break;
          case "attack":
            attack(s, Array(op.hits).fill(op.amount), op.type, op.leech);
            break;
          case "scry":
            s.zones.scry = true;
            break;
          case "flip-hand":
            flipCards(s.zones, source, { kind: "hand" }, rng);
            break;
          case "keep-hand":
            keepCards(s.zones, source, { kind: "hand" }, rng);
            break;
          case "keep-self":
            keepCards(s.zones, source, { kind: "source" }, rng);
            break;
          case "reflect":
            s.player.reflect = true;
            break;
          case "turn-hand":
            for (const card of s.zones.hand) card.face = op.face;
            break;
        }
      }
  }
  if (
    banishSource ||
    [
      "Bloom",
      "Wither",
      "Mirror",
      "Candle",
      "Extinguished Candle",
      "Ash",
      "Memory",
      "Oblivion",
      "Silence",
      "Ice Crystal",
    ].includes(name)
  )
    s.zones.banished.push(source);
  else finishSource(s.zones, source);
  if (s.player.hp === 0) {
    s.phase = "defeat";
    s.message = "You fell.";
  } else if (s.enemy.hp === 0) victory(s, rng);
  else s.message = `Played ${name}.`;
  return yes();
};
export function createRun(seed: number) {
  const deck = starter.flatMap((pair, i) => [
    { id: `card-${i * 2}`, pair },
    { id: `card-${i * 2 + 1}`, pair },
  ]);
  const initial: RunState = {
    phase: "battle",
    fight: 0,
    deck,
    nextId: 10,
    player: combatant(30),
    enemy: combatant(18),
    zones: emptyZones(),
    mana: 3,
    action: 0,
    offers: [],
    message: "",
  };
  // Initialization consumes the same serializable RNG stream as later commands.
  const boot: Handler<RunState, { type: "boot" }, string> = (s, _c, rng) => {
    beginFight(s, rng);
    return yes();
  };
  // Start through a session command so shuffling is replayable and persisted in its snapshot.
  const initialized = createSession(initial, seed, boot);
  initialized.dispatch({ type: "boot" });
  return restoreSession(initialized.getSnapshot(), runHandler);
}
