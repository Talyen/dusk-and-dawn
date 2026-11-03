import { attackValues, type Combatant, type DamageType, type ScalingModel } from "./combat-status";

export interface Hit {
  amount: number;
  type: DamageType;
}
export interface ResolvedHit extends Hit {
  target: "defender" | "attacker";
  absorbed: number;
}

/** Resolves one direct attack. Its caller resolves other printed sentences and traits. */
export function directAttack(
  attacker: Combatant,
  defender: Combatant,
  hits: readonly Hit[],
  options: { weakness?: DamageType; leech: boolean; scaling: ScalingModel; ignoreWard?: boolean },
): ResolvedHit[] {
  if (hits.length === 0) throw new Error("An attack must have at least one hit");
  const bonus = hits[0]!.type === options.weakness ? 2 : 0;
  const values = attackValues(
    hits.map((hit) => hit.amount),
    attacker.bless,
    attacker.curse,
    bonus,
    options.scaling,
  );
  attacker.bless = 0;
  attacker.curse = 0;
  const resolved: ResolvedHit[] = [];
  let leechTotal = 0;
  for (let index = 0; index < hits.length; index += 1) {
    if (attacker.hp === 0 || defender.hp === 0) break;
    const hit = hits[index]!;
    const amount = values[index]!;
    const reflected = defender.reflect;
    if (reflected) defender.reflect = false;
    const target = reflected ? attacker : defender;
    const absorbed = options.ignoreWard ? 0 : Math.min(target.ward, amount);
    target.ward -= absorbed;
    target.hp = Math.max(0, target.hp - (amount - absorbed));
    resolved.push({ type: hit.type, amount, target: reflected ? "attacker" : "defender", absorbed });
    leechTotal += amount;
  }
  if (options.leech && attacker.hp > 0) attacker.hp = Math.min(attacker.maxHp, attacker.hp + leechTotal);
  return resolved;
}
