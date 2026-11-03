import { describe, expect, it } from "vitest";
import { directAttack } from "../../src/lib/game/direct-attack";
import type { Combatant } from "../../src/lib/game/combat-status";
const combatant = (changes: Partial<Combatant> = {}): Combatant => ({
  hp: 30,
  maxHp: 30,
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
  ...changes,
});

describe("direct attacks", () => {
  it("applies weakness, then the explicit scaling preview, then Ward; Leech counts absorption and overkill", () => {
    const attacker = combatant({ hp: 20, bless: 1, curse: 2 });
    const defender = combatant({ hp: 2, ward: 3 });
    expect(
      directAttack(attacker, defender, [{ amount: 4, type: "Shadow" }], {
        weakness: "Shadow",
        leech: true,
        scaling: "flat-preview",
      }),
    ).toEqual([{ type: "Shadow", amount: 5, target: "defender", absorbed: 3 }]);
    expect([attacker.hp, attacker.bless, attacker.curse, defender.hp]).toEqual([25, 0, 0, 0]);
  });
  it("reflects only the first hit with its final type and value, and does not reflect recursively", () => {
    const attacker = combatant({ ward: 2, reflect: true, bless: 1 });
    const defender = combatant({ reflect: true });
    const hits = directAttack(
      attacker,
      defender,
      [
        { amount: 3, type: "Fire" },
        { amount: 2, type: "Fire" },
      ],
      { leech: false, scaling: "flat-preview" },
    );
    expect(hits).toEqual([
      { type: "Fire", amount: 4, target: "attacker", absorbed: 2 },
      { type: "Fire", amount: 3, target: "defender", absorbed: 0 },
    ]);
    expect([attacker.hp, defender.hp, attacker.reflect, defender.reflect]).toEqual([28, 27, true, false]);
  });
  it("spends Reflect on zero damage and cannot revive a reflected attacker", () => {
    const attacker = combatant({ hp: 1, curse: 9 });
    const defender = combatant({ reflect: true });
    directAttack(attacker, defender, [{ amount: 2, type: "Shadow" }], {
      leech: true,
      scaling: "flat-preview",
    });
    expect([defender.reflect, attacker.curse, attacker.hp]).toEqual([false, 0, 1]);
    defender.reflect = true;
    directAttack(attacker, defender, [{ amount: 5, type: "Shadow" }], {
      leech: true,
      scaling: "flat-preview",
    });
    expect(attacker.hp).toBe(0);
  });
});
