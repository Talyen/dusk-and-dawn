import { rngInt, type Rng } from "../random";

/** Values are fight-local and never carry to the next encounter. */
export interface Combatant {
  hp: number;
  maxHp: number;
  ward: number;
  burn: number;
  poison: number;
  bless: number;
  curse: number;
  reflect: boolean;
  hush: boolean;
  freeze: boolean;
  nextDrawPenalty: number;
  nextManaPenalty: number;
}

export type DamageType =
  | "Radiance"
  | "Shadow"
  | "Growth"
  | "Decay"
  | "Binding"
  | "Release"
  | "Fire"
  | "Frost"
  | "Memory"
  | "Oblivion";
export type ScalingModel = "flat-preview" | "percentage-preview";
export type StatusKind =
  | "ward"
  | "burn"
  | "poison"
  | "bless"
  | "curse"
  | "reflect"
  | "hush"
  | "freeze"
  | "nextDrawPenalty"
  | "nextManaPenalty";
export interface DamageEvent {
  target: "player" | "enemy";
  type: DamageType;
  amount: number;
  absorbed: number;
  source: "burn" | "poison";
}

const harmful: readonly StatusKind[] = [
  "burn",
  "poison",
  "curse",
  "hush",
  "freeze",
  "nextDrawPenalty",
  "nextManaPenalty",
];
const beneficial: readonly StatusKind[] = ["ward", "reflect", "bless"];

function nonnegativeInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Expected a nonnegative integer");
}

export function halveWard(holder: Combatant): void {
  holder.ward = Math.floor(holder.ward / 2);
}

export function applyDamageOverTime(holder: Combatant, status: "burn" | "poison", amount: number): void {
  nonnegativeInteger(amount);
  holder[status] = Math.max(holder[status], amount);
}

/** Called after discarding. Defeat stops the sequence immediately. */
export function resolveDamageOverTime(player: Combatant, enemy: Combatant): DamageEvent[] {
  const events: DamageEvent[] = [];
  if (player.hp <= 0 || enemy.hp <= 0) return events;
  for (const [target, holder, status, type] of [
    ["player", player, "burn", "Fire"],
    ["player", player, "poison", "Decay"],
    ["enemy", enemy, "burn", "Fire"],
    ["enemy", enemy, "poison", "Decay"],
  ] as const) {
    const amount = holder[status];
    if (amount === 0) continue;
    const absorbed = Math.min(holder.ward, amount);
    holder.ward -= absorbed;
    holder.hp = Math.max(0, holder.hp - (amount - absorbed));
    holder[status] = Math.floor(amount / 2);
    events.push({ target, type, amount, absorbed, source: status });
    if (holder.hp === 0) break;
  }
  return events;
}

/** Predict the first lethal end-of-turn tick without changing either combatant. */
export function lethalDamageOverTime(
  player: Combatant,
  enemy: Combatant,
): Pick<DamageEvent, "target" | "source"> | undefined {
  const playerAfter = { ...player };
  const enemyAfter = { ...enemy };
  const last = resolveDamageOverTime(playerAfter, enemyAfter).at(-1);
  if (!last || (last.target === "player" ? playerAfter.hp : enemyAfter.hp) !== 0) return undefined;
  return { target: last.target, source: last.source };
}

/** The caller must explicitly select a comparison model; neither model is final. */
export function attackValues(
  hits: readonly number[],
  bless: number,
  curse: number,
  firstHitWeakness: number,
  model: ScalingModel,
): number[] {
  nonnegativeInteger(bless);
  nonnegativeInteger(curse);
  nonnegativeInteger(firstHitWeakness);
  return hits.map((hit, index) => {
    nonnegativeInteger(hit);
    const base = hit + (index === 0 ? firstHitWeakness : 0);
    if (model === "flat-preview") return Math.max(0, base + bless - curse);
    if (model === "percentage-preview") {
      const quarters = Math.max(0, Math.min(8, 4 + bless - curse));
      return Math.floor((base * quarters + 2) / 4);
    }
    throw new Error("An explicit preview model is required");
  });
}

/** The random choice is uniform by status kind, never by number of stacks. */
export function removeStatuses(
  holder: Combatant,
  operation: "cleanse" | "purge",
  quantity: "all" | "one-random",
  rng: Rng,
): StatusKind[] {
  const eligible = (operation === "cleanse" ? harmful : beneficial).filter((status) => !!holder[status]);
  const removed =
    quantity === "all" ? eligible : eligible.length ? [eligible[rngInt(rng, eligible.length)]!] : [];
  for (const status of removed) {
    if (status === "reflect" || status === "hush" || status === "freeze") holder[status] = false;
    else holder[status] = 0;
  }
  return removed;
}
