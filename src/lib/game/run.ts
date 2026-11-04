import { heroes, type HeroId } from "./heroes";
import { simpleEnemies } from "./simple-enemies.generated";
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
  | (typeof simpleCards)[keyof typeof simpleCards]["dark"]["ops"][number]
  | { readonly op: "shuffle-library" }
  | { readonly op: "hand-library"; readonly position: "top" };
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
  "Cartographer & Lost Wanderer": {
    light: {
      name: "Cartographer",
      effect: "Look at the top 3 cards of your library. Put them back in any order.",
      keywords: [],
    },
    dark: { name: "Lost Wanderer", effect: "Shuffle your library. Draw 2 cards.", keywords: [] },
  },
  "Walled City & Wilderness": {
    light: { name: "Walled City", effect: "Gain 10 Ward.", keywords: ["Ward"] },
    dark: {
      name: "Wilderness",
      effect:
        "Look at the top 3 cards of your library. Put 1 in your hand and the rest on the bottom in library order.",
      keywords: [],
    },
  },
  "Balance Scales & Loaded Dice": {
    light: { name: "Balance Scales", effect: "Bless 1. Curse 1.", keywords: ["Bless", "Curse"] },
    dark: {
      name: "Loaded Dice",
      effect:
        "Look at the top 3 cards of your library. Put 2 in your hand and the rest on the bottom in library order.",
      keywords: [],
    },
  },
  "Sieve & Funnel": {
    light: {
      name: "Sieve",
      effect:
        "Look at the top 4 cards of your library. Put 1 in your hand and discard the rest in library order.",
      keywords: [],
    },
    dark: { name: "Funnel", effect: "Put your hand on top of your library. Draw 1 card.", keywords: [] },
  },
  "Sacrifice & Self-Preservation": {
    light: {
      name: "Sacrifice",
      effect: "Banish another card of your choice from your hand. Deal 8 Radiance damage.",
      keywords: ["Banish", "Radiance"],
    },
    dark: { name: "Self-Preservation", effect: "Gain 6 Ward.", keywords: ["Ward"] },
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
    "Sacrifice & Self-Preservation",
    "Cartographer & Lost Wanderer",
    "Walled City & Wilderness",
    "Balance Scales & Loaded Dice",
    "Sieve & Funnel",
    "Seed & Ash",
    "Lantern & Shroud",
    "Memory & Oblivion",
    "Silence & Clamor",
    "Ice Crystal & Salt Crystal",
  ]),
].filter((pair) => !starter.includes(pair));

interface EnemyEffect {
  op: string;
  amount?: number | "all";
  stage?: string;
  to?: string;
  face?: "light" | "dark";
  minimum?: number;
  maximum?: number;
  fallback?: number;
}
interface Action {
  name: string;
  text: string;
  hit?: number;
  type?: DamageType;
  extra?: number;
  extraHits?: readonly number[];
  traitBonus?: number;
  ability?: "curse" | "heal" | "banish" | "ward" | "bless" | "move_top" | "turn_after_draw";
  abilityAmount?: number;
  baseEffect?: EnemyEffect;
  condition?: string;
  rider?: "curse" | "poison";
  effects?: readonly EnemyEffect[];
}

interface Enemy {
  name: string;
  hp: number;
  weakness: DamageType;
  trait: string;
  traitEffect: string;
  actions: readonly Action[];
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
export const supportedEnemies: readonly Enemy[] = simpleEnemies;
const enemyIndex = new Map<string, Enemy>(simpleEnemies.map((enemy) => [enemy.id, enemy]));
export function validEncounter(id: string): boolean {
  return id === "fixture:0" || id === "fixture:4" || enemyIndex.has(id);
}
export function getEnemy(s: Pick<RunState, "fight" | "encounters" | "experiment">): Enemy {
  const id = s.experiment?.route?.active ? s.experiment.route.enemy : s.encounters?.[s.fight];
  if (id === "fixture:0") return route[0]!;
  if (id === "fixture:4") return route[4]!;
  if (id) {
    const enemy = enemyIndex.get(id);
    if (!enemy) throw new Error(`Unknown enemy: ${id}`);
    return enemy;
  }
  return route[s.fight]!;
}
function unlocked<T>(items: readonly T[], tier: number): T[] {
  return items.slice(0, Math.ceil((items.length * Math.min(3, Math.max(1, tier))) / 3));
}
function rewardPool(tier: number, hero?: HeroId) {
  const pool = unlocked(rewards, tier);
  if (!hero) return pool;
  const kit = new Set<string>(heroes[hero].pairs);
  return [...pool, ...starter.filter((pair) => !kit.has(pair))];
}
function chooseEncounters(rng: Rng, tier = 3): string[] {
  const regular = unlocked(
    simpleEnemies.filter((enemy) => enemy.hp <= 30 && enemy.name !== "Radiant Moth"),
    tier,
  );
  const elites = unlocked(
    simpleEnemies.filter((enemy) => enemy.hp >= 32 && enemy.hp < 42),
    tier,
  );
  const bosses = unlocked(
    simpleEnemies.filter((enemy) => enemy.hp >= 42),
    tier,
  );
  const regulars = shuffle(regular, rng)
    .slice(0, 2)
    .map((enemy) => enemy.id);
  const elite = shuffle(elites, rng)[0]!.id;
  const boss = shuffle(bosses, rng)[0]!.id;
  return ["fixture:0", ...regulars, elite, boss];
}
interface DeckCard {
  id: string;
  pair: Pair;
}
export interface PendingChoice {
  kind: "order" | "select-bottom" | "select-discard";
  source: FightCard;
  cards: FightCard[];
  required: number;
}
export interface RunState {
  phase: "battle" | "reward" | "rest" | "route" | "victory" | "defeat";
  hero?: HeroId | undefined;
  heroRuleset?: 2 | undefined;
  experiment?:
    | {
        id: string;
        tier: number;
        orientation: "light" | "dark";
        relic: "none" | "many-eyes" | "spare-thread" | "cracked-vessel";
        route?: { enemy: string; pair: Pair; active: boolean } | undefined;
        restRemovals?: number | undefined;
      }
    | undefined;
  fight: number;
  encounters?: string[] | undefined;
  deck: DeckCard[];
  nextId: number;
  player: Combatant;
  enemy: Combatant;
  zones: CardZones;
  mana: number;
  action: number;
  offers: Pair[];
  message: string;
  pending?: PendingChoice | undefined;
  latestDirectHit?: number | undefined;
}
export type Command =
  | { type: "play"; id: string; targets?: string[] }
  | { type: "choose"; ids: string[] }
  | { type: "end" }
  | { type: "reward"; pair: Pair | null }
  | { type: "rest"; remove?: string }
  | { type: "route"; choice: "combat" | "rest" | "event" }
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
  s.enemy = combatant(getEnemy(s).hp);
  s.action = 0;
  delete s.latestDirectHit;
  applyEnemyIntent(s);
  s.mana = 3;
  s.zones = emptyZones();
  s.zones.library = shuffle(
    s.deck.map((c) => ({ ...c, face: s.experiment?.orientation ?? ("light" as const), kept: false })),
    rng,
  );
  drawCards(s.zones, 5, rng);
  if (s.hero === "veiled-oracle") s.zones.scry = true;
  s.phase = "battle";
  s.message = `Fight ${s.fight + 1}: ${getEnemy(s).name}`;
}
function victory(s: RunState, rng: Rng) {
  if (s.fight === route.length - 1 && !s.experiment?.route?.active) {
    s.phase = "victory";
    s.message = `${getEnemy(s).name} falls.`;
    return;
  }
  const owned = new Set(s.deck.map((c) => c.pair));
  s.offers = shuffle(
    rewardPool(s.experiment?.tier ?? 3, s.hero).filter((p) => !owned.has(p)),
    rng,
  ).slice(0, s.experiment?.relic === "many-eyes" ? 4 : 3);
  s.phase = "reward";
  s.message = "Choose a card pair or skip.";
}
function attack(s: RunState, hits: number[], type: DamageType, leech = false, ignoreWard = false) {
  const resolved = directAttack(
    s.player,
    s.enemy,
    hits.map((amount) => ({ amount, type })),
    {
      weakness: getEnemy(s).weakness,
      leech,
      scaling: "flat-preview",
      ignoreWard,
      finishOnDefenderDefeat: true,
    },
  );
  if (resolved.length) s.latestDirectHit = resolved.at(-1)!.amount;
}
/** The trait's contribution can be suppressed without suppressing a base attack. */
export function enemyAttackHits(action: Action, hush: boolean, latestDirectHit?: number): number[] {
  if (action.hit === undefined) return [];
  const copy = !hush ? action.effects?.find((effect) => effect.op === "copy_latest_hit") : undefined;
  const base = copy
    ? Math.max(
        copy.minimum ?? 0,
        Math.min(copy.maximum ?? Infinity, latestDirectHit ?? copy.fallback ?? action.hit),
      )
    : action.hit;
  return [
    base + (hush ? 0 : (action.traitBonus ?? 0)),
    ...(!hush && action.extra !== undefined ? [action.extra] : []),
    ...(!hush ? (action.extraHits ?? []) : []),
  ];
}
function applyEnemyIntent(s: RunState): void {
  const action = getEnemy(s).actions[s.action]!;
  if (!s.enemy.hush && action.effects?.some((effect) => effect.op === "reflect_once")) s.enemy.reflect = true;
}
function hushEnemy(s: RunState): void {
  const action = getEnemy(s).actions[s.action]!;
  if (action.effects?.some((effect) => effect.op === "reflect_once")) s.enemy.reflect = false;
  s.enemy.hush = true;
}
function applyEnemyEffect(
  s: RunState,
  effect: EnemyEffect,
  rng: Rng,
  context: { nextFace?: "light" | "dark" },
): void {
  const amount = typeof effect.amount === "number" ? effect.amount : 0;
  switch (effect.op) {
    case "curse":
      s.player.curse += amount;
      break;
    case "poison":
    case "burn":
      applyDamageOverTime(s.player, effect.op, amount);
      break;
    case "heal":
      s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + amount);
      break;
    case "ward":
      s.enemy.ward += amount;
      break;
    case "bless":
      s.enemy.bless += amount;
      break;
    case "remove_burn":
      s.enemy.burn = 0;
      break;
    case "remove_poison":
      s.enemy.poison = 0;
      break;
    case "remove_ward":
      s.player.ward = Math.max(0, s.player.ward - amount);
      break;
    case "reduce_next_draw":
      s.player.nextDrawPenalty = Math.max(s.player.nextDrawPenalty, amount);
      break;
    case "reduce_next_mana":
      s.player.nextManaPenalty = Math.max(s.player.nextManaPenalty, amount);
      break;
    case "turn_after_draw":
      if (effect.face) context.nextFace = effect.face;
      break;
    case "turn_held":
      if (effect.face) for (const card of s.zones.hand) card.face = effect.face;
      break;
    case "flip_held": {
      const pool = [...s.zones.hand];
      const count = effect.amount === "all" ? pool.length : Math.min(amount, pool.length);
      for (let i = 0; i < count; i++) {
        const [card] = pool.splice(rngInt(rng, pool.length), 1);
        card!.face = card!.face === "light" ? "dark" : "light";
      }
      break;
    }
    case "move_held": {
      const candidates = [...s.zones.hand];
      const selected = new Set<string>();
      for (let i = 0; i < amount && candidates.length; i++) {
        const [card] = candidates.splice(rngInt(rng, candidates.length), 1);
        selected.add(card!.id);
      }
      const moved = s.zones.hand.filter((card) => selected.has(card.id));
      s.zones.hand = s.zones.hand.filter((card) => !selected.has(card.id));
      for (const card of moved) card.kept = false;
      if (effect.to === "player_draw_top") s.zones.library.push(...moved.reverse());
      else if (effect.to === "player_draw_bottom") s.zones.library.unshift(...moved.reverse());
      else if (effect.to === "player_discard") s.zones.discard.push(...moved.reverse());
      else if (effect.to === "player_banished") s.zones.banished.push(...moved.reverse());
      else throw new Error(`Unsupported held-card destination: ${effect.to}`);
      break;
    }
    case "move_top": {
      if (!s.zones.library.length && s.zones.discard.length) {
        s.zones.library = shuffle(s.zones.discard, rng);
        s.zones.discard = [];
      }
      const moved: FightCard[] = [];
      for (let i = 0; i < amount; i++) {
        const card = s.zones.library.pop();
        if (!card) break;
        card.kept = false;
        moved.push(card);
      }
      if (effect.to === "player_discard") s.zones.discard.push(...moved.reverse());
      else if (effect.to === "player_draw_bottom") s.zones.library.unshift(...moved.reverse());
      else if (effect.to === "player_banished") s.zones.banished.push(...moved.reverse());
      else throw new Error(`Unsupported library destination: ${effect.to}`);
      break;
    }
    case "recover_to_top": {
      const card = s.zones.discard.pop();
      if (card) s.zones.library.push(card);
      break;
    }
    case "ignore_ward":
    case "copy_latest_hit":
    case "reflect_once":
    case "reaction_damage":
    case "leech":
      break;
    default:
      throw new Error(`Unsupported enemy effect: ${effect.op}`);
  }
}
/** Visible preflight checks never consume mana or reveal random outcomes. */
export function cardRestriction(s: RunState, source: FightCard): string {
  const info = face(source);
  const ops = info.ops ?? [];
  const action = getEnemy(s).actions[s.action]!;
  if (
    (info.name === "Silence" || ops.some((op) => op.op === "hush")) &&
    (s.enemy.hush ||
      !(
        action.ability ||
        action.traitBonus ||
        action.extra ||
        action.extraHits?.length ||
        action.rider ||
        action.effects?.length
      ))
  )
    return "Hush requires an unsuppressed ability or trait in the next intent.";
  if ((info.name === "Ice Crystal" || ops.some((op) => op.op === "freeze")) && s.enemy.freeze)
    return "The enemy is already Frozen.";
  if (info.name === "Sacrifice" && s.zones.hand.length <= 1)
    return "Another card in hand is required as payment.";
  const loss = ops.find((op) => op.op === "lose-hp");
  if (loss && s.player.hp <= loss.amount) return "Not enough HP to pay this cost.";
  const first = ops[0];
  if (first && ops.slice(1).some((op) => op.op !== "banish")) {
    if (first.op === "discard-random" && s.zones.hand.length <= 1)
      return "Another card in hand is required as payment.";
    if (first.op === "banish-random" && s.zones.hand.length <= 1)
      return "Another card in hand is required as payment.";
    if (first.op === "banish-library-top" && !s.zones.library.length && !s.zones.discard.length)
      return "A card in the library or discard pile is required as payment.";
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
function resolveInspection(s: RunState, ids: string[]): boolean {
  const pending = s.pending;
  if (
    !pending ||
    ids.length !== pending.required ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !pending.cards.some((card) => card.id === id))
  )
    return false;
  if (pending.kind === "order") {
    const ordered = ids.map((id) => pending.cards.find((card) => card.id === id)!);
    s.zones.library.push(...ordered.reverse());
  } else {
    const chosen = pending.cards.filter((card) => ids.includes(card.id));
    const remainder = pending.cards.filter((card) => !ids.includes(card.id));
    s.zones.hand.push(...chosen);
    if (pending.kind === "select-bottom") s.zones.library.unshift(...remainder.reverse());
    else s.zones.discard.push(...remainder.reverse());
  }
  finishSource(s.zones, pending.source);
  s.message = `Played ${face(pending.source).name}.`;
  delete s.pending;
  return true;
}
function continueRoute(s: RunState, rng: Rng) {
  if (s.experiment) delete s.experiment.route;
  s.fight++;
  beginFight(s, rng);
}
function offerRoute(s: RunState, rng: Rng) {
  const experiment = s.experiment!;
  const candidates = unlocked(
    simpleEnemies.filter((enemy) => enemy.hp <= 30 && enemy.name !== "Radiant Moth"),
    experiment.tier,
  ).filter((enemy) => !s.encounters?.includes(enemy.id));
  const pairs = rewardPool(experiment.tier, s.hero).filter(
    (pair) => !s.deck.some((card) => card.pair === pair),
  );
  if (!candidates.length || !pairs.length) {
    continueRoute(s, rng);
    return;
  }
  experiment.route = {
    enemy: candidates[rngInt(rng, candidates.length)]!.id,
    pair: pairs[rngInt(rng, pairs.length)]!,
    active: false,
  };
  s.phase = "route";
  s.message = "Choose a path. The routes rejoin before the next encounter.";
}
export const runHandler: Handler<RunState, Command, string> = (s, command, rng) => {
  if (command.type === "concede") {
    if (s.pending) return no("Finish the committed inspection first.");
    if (s.phase !== "battle") return no("No battle to concede.");
    s.phase = "defeat";
    s.message = "Run conceded.";
    return yes();
  }
  if (command.type === "choose") {
    if (s.phase !== "battle" || !resolveInspection(s, command.ids)) return no("Invalid inspection choice.");
    return yes();
  }
  if (s.pending) return no("Finish the committed inspection first.");
  if (command.type === "reward") {
    if (s.phase !== "reward" || (command.pair !== null && !s.offers.includes(command.pair)))
      return no("Invalid reward.");
    if (command.pair) s.deck.push({ id: `card-${s.nextId++}`, pair: command.pair });
    s.offers = [];
    if (s.experiment?.route?.active) continueRoute(s, rng);
    else if (s.fight === 1) {
      s.phase = "rest";
      s.message = "Heal 6 HP or remove one card.";
    } else if (s.experiment && (s.fight === 0 || s.fight === 2)) offerRoute(s, rng);
    else continueRoute(s, rng);
    return yes();
  }
  if (command.type === "route") {
    const path = s.experiment?.route;
    if (s.phase !== "route" || !path || path.active || !["combat", "rest", "event"].includes(command.choice))
      return no("No path is available.");
    if (command.choice === "event" && s.player.hp <= 4) return no("The event requires more than 4 HP.");
    if (command.choice === "combat") {
      path.active = true;
      beginFight(s, rng);
    } else {
      if (command.choice === "rest") s.player.hp = Math.min(s.player.maxHp, s.player.hp + 4);
      else {
        s.player.hp -= 4;
        s.deck.push({ id: `card-${s.nextId++}`, pair: path.pair });
      }
      continueRoute(s, rng);
    }
    return yes();
  }
  if (command.type === "rest") {
    if (s.phase !== "rest") return no("No rest available.");
    if (command.remove !== undefined) {
      const i = s.deck.findIndex((c) => c.id === command.remove);
      if (i < 0) return no("Choose a card in the deck.");
      s.deck.splice(i, 1);
      if (s.experiment?.relic === "spare-thread" && !s.experiment.restRemovals) {
        s.experiment.restRemovals = 1;
        s.message = "Remove one more card or continue.";
        return yes();
      }
    } else if (!s.experiment?.restRemovals) s.player.hp = Math.min(s.player.maxHp, s.player.hp + 6);
    continueRoute(s, rng);
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
    const a = getEnemy(s).actions[s.action]!;
    const suppressed = s.enemy.hush;
    const activeTrait =
      !suppressed && (!a.condition || (a.condition === "enemy_has_Burn_after_tick" && s.enemy.burn > 0));
    const skipped = s.enemy.freeze || (suppressed && a.ability !== undefined);
    const context: { nextFace?: "light" | "dark" } = {};
    if (!skipped && activeTrait)
      for (const effect of a.effects ?? [])
        if (
          effect.stage === "before_attack" &&
          effect.op !== "ignore_ward" &&
          effect.op !== "copy_latest_hit"
        )
          applyEnemyEffect(s, effect, rng, context);
    if (!skipped && a.hit !== undefined && a.type) {
      const bypass = activeTrait
        ? a.effects?.find((effect) => effect.op === "ignore_ward")?.amount
        : undefined;
      const leech = !!(activeTrait && a.effects?.some((effect) => effect.op === "leech"));
      directAttack(
        s.enemy,
        s.player,
        enemyAttackHits(a, !activeTrait, s.latestDirectHit).map((amount, index) => ({
          amount,
          type: a.type!,
          ...(index === 0 && bypass !== undefined ? { bypassWard: bypass } : {}),
        })),
        { leech, scaling: "flat-preview" },
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
    if (!skipped && a.baseEffect) applyEnemyEffect(s, a.baseEffect, rng, context);
    else if (!skipped && a.ability === "curse") s.player.curse += a.abilityAmount ?? 1;
    else if (!skipped && a.ability === "heal")
      s.enemy.hp = Math.min(s.enemy.maxHp, s.enemy.hp + (a.abilityAmount ?? 3));
    else if (!skipped && a.ability === "ward") s.enemy.ward += a.abilityAmount ?? 0;
    else if (!skipped && a.ability === "bless") s.enemy.bless += a.abilityAmount ?? 0;
    else if (!skipped && a.ability === "banish")
      applyEnemyEffect(s, { op: "move_top", amount: 1, to: "player_banished" }, rng, context);
    if (!skipped && !suppressed && a.rider === "curse") s.player.curse++;
    if (!skipped && !suppressed && a.rider === "poison") applyDamageOverTime(s.player, "poison", 3);
    if (!skipped && activeTrait)
      for (const effect of a.effects ?? [])
        if (effect.stage === "after_attack") applyEnemyEffect(s, effect, rng, context);
    if (s.enemy.hp === 0) {
      victory(s, rng);
      return yes();
    }
    if (a.effects?.some((effect) => effect.op === "reflect_once")) s.enemy.reflect = false;
    s.enemy.hush = false;
    if (s.enemy.freeze) s.enemy.freeze = false;
    s.action = (s.action + 1) % getEnemy(s).actions.length;
    halveWard(s.player);
    s.mana = Math.max(0, 3 - s.player.nextManaPenalty);
    const drawCount = Math.max(0, 5 - s.player.nextDrawPenalty);
    s.player.nextManaPenalty = 0;
    s.player.nextDrawPenalty = 0;
    drawCards(s.zones, drawCount, rng);
    if (context.nextFace) for (const card of s.zones.hand) card.face = context.nextFace;
    if (s.hero === "veiled-oracle") s.zones.scry = true;
    delete s.latestDirectHit;
    applyEnemyIntent(s);
    s.message = skipped ? `${a.name} skipped.` : `${a.name} resolved.`;
    return yes();
  }
  const index = s.zones.hand.findIndex((c) => c.id === command.id);
  const source = s.zones.hand[index];
  if (!source || s.mana < 1) return no("Card unavailable or insufficient mana.");
  const playedFace = face(source);
  const name = playedFace.name;
  const isDirectAttack =
    ["Vampire", "Sun", "Wither", "Thorns", "Shattered Mirror", "Ash", "Oblivion", "Sacrifice"].includes(
      name,
    ) || !!playedFace.ops?.some((op) => op.op === "attack" || op.op === "attack-ignore-ward");
  const restriction = cardRestriction(s, source);
  if (restriction) return no(restriction);
  const requestedIds = command.targets ?? [];
  const eligible =
    name === "Sacrifice"
      ? s.zones.hand.filter((card) => card.id !== source.id)
      : name === "Memory"
        ? s.zones.discard
        : [];
  const ids = requestedIds.length === 0 && eligible.length === 1 ? [eligible[0]!.id] : requestedIds;
  if (name === "Sacrifice") {
    if (ids.length !== 1 || ids[0] === source.id || !findTargets(s.zones.hand, ids))
      return no("Choose another card in hand to Banish.");
  } else if (name === "Memory") {
    if (
      (s.zones.discard.length > 0 && (ids.length !== 1 || !findTargets(s.zones.discard, ids))) ||
      (s.zones.discard.length === 0 && ids.length !== 0)
    )
      return no("Choose a card in your discard pile.");
  } else if (ids.length) return no("This card takes no targets.");
  s.zones.hand.splice(index, 1);
  source.kept = false;
  s.mana--;
  if (s.hero === "oathless-seraph" && source.face === "light") s.player.ward++;
  if (s.hero === "thorn-witch" && source.face === "dark") {
    if (s.heroRuleset === 2) s.enemy.curse++;
    else applyDamageOverTime(s.enemy, "poison", 2);
  }
  let banishSource = false;
  let sourceMoved = false;
  let referenced: FightCard | null = null;
  const prepareLibrary = () => {
    if (!s.zones.library.length && s.zones.discard.length) {
      s.zones.library = shuffle(s.zones.discard, rng);
      s.zones.discard = [];
    }
  };
  switch (name) {
    case "Cartographer":
    case "Wilderness":
    case "Loaded Dice":
    case "Sieve": {
      prepareLibrary();
      const count = name === "Sieve" ? 4 : 3;
      const inspected: FightCard[] = [];
      for (let i = 0; i < count; i++) {
        const card = s.zones.library.pop();
        if (!card) break;
        inspected.push(card);
      }
      const kind = name === "Cartographer" ? "order" : name === "Sieve" ? "select-discard" : "select-bottom";
      const wanted = name === "Loaded Dice" ? 2 : 1;
      const required =
        kind === "order" ? inspected.length : Math.min(wanted, inspected.length, 8 - s.zones.hand.length);
      s.pending = { source, cards: inspected, kind, required };
      if (
        required === 0 ||
        (kind === "order" && required === 1) ||
        (kind !== "order" && required === inspected.length)
      )
        resolveInspection(
          s,
          inspected.slice(0, required).map((card) => card.id),
        );
      else
        s.message =
          kind === "order"
            ? "Choose the order from top to bottom."
            : `Choose ${required} card${required === 1 ? "" : "s"} to put in your hand.`;
      return yes();
    }
    case "Lost Wanderer":
      s.zones.library = shuffle(s.zones.library, rng);
      drawCards(s.zones, 2, rng);
      break;
    case "Walled City":
      s.player.ward += 10;
      break;
    case "Balance Scales":
      s.player.bless++;
      s.enemy.curse++;
      break;
    case "Funnel": {
      const moved = s.zones.hand.splice(0);
      for (const card of moved) card.kept = false;
      s.zones.library.push(...moved.reverse());
      drawCards(s.zones, 1, rng);
      break;
    }
    case "Sacrifice": {
      const i = s.zones.hand.findIndex((card) => card.id === ids[0]);
      const card = s.zones.hand.splice(i, 1)[0]!;
      card.kept = false;
      s.zones.banished.push(card);
      attack(s, [8], "Radiance");
      break;
    }
    case "Self-Preservation":
      s.player.ward += 6;
      break;
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
      hushEnemy(s);
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
          case "attack-ignore-ward":
            attack(s, [op.amount], op.type, false, true);
            break;
          case "source-library-bottom":
            source.kept = false;
            s.zones.library.unshift(source);
            sourceMoved = true;
            break;
          case "shuffle-hand":
            for (const card of s.zones.hand) card.kept = false;
            s.zones.library = shuffle([...s.zones.library, ...s.zones.hand], rng);
            s.zones.hand = [];
            break;
          case "shuffle-library":
            s.zones.library = shuffle(s.zones.library, rng);
            break;
          case "hand-library": {
            const moved = s.zones.hand.splice(0);
            for (const card of moved) card.kept = false;
            if (op.position === "top") s.zones.library.push(...moved.reverse());
            else s.zones.library.unshift(...moved.reverse());
            break;
          }
          case "discard-library-top": {
            const count = Math.min(op.count, s.zones.discard.length);
            const moved =
              op.position === "top"
                ? s.zones.discard.splice(s.zones.discard.length - count, count)
                : s.zones.discard.splice(0, count);
            s.zones.library.push(...moved);
            break;
          }
          case "discard-library-bottom":
            s.zones.library.unshift(...s.zones.discard.splice(0, op.count));
            break;
          case "return-top-discard": {
            for (let i = 0; i < op.count && s.zones.hand.length < 8; i++) {
              const card = s.zones.discard.pop();
              if (!card) break;
              s.zones.hand.push(card);
            }
            break;
          }
          case "flip-discard-top":
            referenced = s.zones.discard.at(-1) ?? null;
            if (referenced) referenced.face = referenced.face === "light" ? "dark" : "light";
            break;
          case "light-discard-top":
            referenced = s.zones.discard.at(-1) ?? null;
            if (referenced) referenced.face = "light";
            break;
          case "return-reference":
            if (referenced && s.zones.hand.length < 8) {
              const i = s.zones.discard.indexOf(referenced);
              if (i >= 0) s.zones.hand.push(s.zones.discard.splice(i, 1)[0]!);
            }
            break;
          case "keep-reference":
            if (referenced && s.zones.hand.includes(referenced)) referenced.kept = true;
            break;
          case "banish-library-top":
            prepareLibrary();
            {
              const card = s.zones.library.pop();
              if (card) {
                card.kept = false;
                s.zones.banished.push(card);
              }
            }
            break;
          case "banish-random":
            if (s.zones.hand.length) {
              const [card] = s.zones.hand.splice(rngInt(rng, s.zones.hand.length), 1);
              card!.kept = false;
              s.zones.banished.push(card!);
            }
            break;
          case "banish-hand":
            for (const card of s.zones.hand) card.kept = false;
            s.zones.banished.push(...s.zones.hand.splice(0));
            break;
          case "library-top-bottom":
            prepareLibrary();
            {
              const card = s.zones.library.pop();
              if (card) s.zones.library.unshift(card);
            }
            break;
          case "reverse-library":
            prepareLibrary();
            {
              const start = Math.max(0, s.zones.library.length - op.count);
              s.zones.library.push(...s.zones.library.splice(start).reverse());
            }
            break;
          case "random-library-bottom":
            if (s.zones.hand.length) {
              const [card] = s.zones.hand.splice(rngInt(rng, s.zones.hand.length), 1);
              card!.kept = false;
              s.zones.library.unshift(card!);
            }
            break;
          case "exchange-random-discard":
            if (s.zones.hand.length && s.zones.discard.length) {
              const i = rngInt(rng, s.zones.hand.length);
              const outgoing = s.zones.hand[i]!;
              const incoming = op.position === "top" ? s.zones.discard.pop()! : s.zones.discard.shift()!;
              outgoing.kept = false;
              incoming.kept = false;
              s.zones.hand[i] = incoming;
              if (op.position === "top") s.zones.discard.push(outgoing);
              else s.zones.discard.unshift(outgoing);
            }
            break;
          case "turn-random": {
            const eligible = s.zones.hand.filter((card) => card.face === op.from);
            if (eligible.length) eligible[rngInt(rng, eligible.length)]!.face = op.face;
            break;
          }
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
            referenced = flipCards(s.zones, source, { kind: "random-hand", count: op.count }, rng)[0] ?? null;
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
            hushEnemy(s);
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
        if (s.player.hp === 0) break;
      }
  }
  if (
    banishSource ||
    (s.player.hp > 0 &&
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
      ].includes(name))
  )
    s.zones.banished.push(source);
  else if (!sourceMoved) finishSource(s.zones, source);
  const reaction = getEnemy(s).actions[s.action]!.effects?.find((effect) => effect.op === "reaction_damage");
  if (isDirectAttack && reaction && !s.enemy.hush && s.enemy.hp > 0 && s.player.hp > 0) {
    const amount = typeof reaction.amount === "number" ? reaction.amount : 0;
    const absorbed = Math.min(s.player.ward, amount);
    s.player.ward -= absorbed;
    s.player.hp = Math.max(0, s.player.hp - (amount - absorbed));
  }
  if (s.player.hp === 0) {
    s.phase = "defeat";
    s.message = "You fell.";
  } else if (s.enemy.hp === 0) victory(s, rng);
  else s.message = `Played ${name}.`;
  return yes();
};
export type ExperimentOptions = {
  id: string;
  tier: number;
  orientation: "light" | "dark";
  relic: "none" | "many-eyes" | "spare-thread" | "cracked-vessel";
};
export function createRun(seed: number, experiment?: ExperimentOptions, hero?: HeroId) {
  const deck = (hero ? heroes[hero].pairs : starter).flatMap((pair, i) => [
    { id: `card-${i * 2}`, pair },
    { id: `card-${i * 2 + 1}`, pair },
  ]);
  const initial: RunState = {
    phase: "battle",
    ...(hero ? { hero, heroRuleset: 2 as const } : {}),
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
    ...(experiment
      ? { experiment: { ...experiment, tier: Math.min(3, Math.max(1, Math.floor(experiment.tier))) } }
      : {}),
  };
  // Initialization consumes the same serializable RNG stream as later commands.
  const boot: Handler<RunState, { type: "boot" }, string> = (s, _c, rng) => {
    s.encounters = chooseEncounters(rng, s.experiment?.tier ?? 3);
    if (s.experiment?.relic === "cracked-vessel") {
      const pool = rewardPool(s.experiment.tier, s.hero).filter(
        (pair) => !s.deck.some((card) => card.pair === pair),
      );
      s.deck.push({ id: `card-${s.nextId++}`, pair: pool[rngInt(rng, pool.length)]! });
      s.player.hp = 24;
    }
    beginFight(s, rng);
    return yes();
  };
  // Start through a session command so shuffling is replayable and persisted in its snapshot.
  const initialized = createSession(initial, seed, boot);
  initialized.dispatch({ type: "boot" });
  return restoreSession(initialized.getSnapshot(), runHandler);
}
