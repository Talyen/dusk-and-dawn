import { describe, expect, it } from "vitest";
import {
  applyDamageOverTime,
  attackValues,
  halveWard,
  removeStatuses,
  resolveDamageOverTime,
  type Combatant,
} from "../../src/lib/game/combat-status";

function fighter(overrides: Partial<Combatant> = {}): Combatant {
  return {
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
    ...overrides,
  };
}

describe("combat status rules", () => {
  it("halves Ward at turn start and keeps the higher DOT application", () => {
    const player = fighter({ ward: 7, burn: 4 });
    halveWard(player);
    expect(player.ward).toBe(3);
    applyDamageOverTime(player, "burn", 2);
    applyDamageOverTime(player, "poison", 3);
    expect([player.burn, player.poison]).toEqual([4, 3]);
  });

  it("ticks in order, through Ward, and decays even when blocked", () => {
    const player = fighter({ ward: 5, burn: 4, poison: 3 });
    const enemy = fighter({ burn: 2, poison: 1 });
    expect(resolveDamageOverTime(player, enemy)).toEqual([
      { target: "player", type: "Fire", amount: 4, absorbed: 4, source: "burn" },
      { target: "player", type: "Decay", amount: 3, absorbed: 1, source: "poison" },
      { target: "enemy", type: "Fire", amount: 2, absorbed: 0, source: "burn" },
      { target: "enemy", type: "Decay", amount: 1, absorbed: 0, source: "poison" },
    ]);
    expect([player.hp, player.ward, player.burn, player.poison]).toEqual([28, 0, 2, 1]);
    expect([enemy.hp, enemy.burn, enemy.poison]).toEqual([27, 1, 0]);
  });

  it("stops DOT immediately on defeat", () => {
    const player = fighter({ hp: 2, burn: 2, poison: 3 });
    const enemy = fighter({ burn: 4 });
    expect(resolveDamageOverTime(player, enemy)).toHaveLength(1);
    expect([player.hp, player.poison, enemy.hp, enemy.burn]).toEqual([0, 3, 30, 4]);
  });

  it("makes both unapproved scaling candidates explicit and applies weakness only to the first hit", () => {
    expect(attackValues([2, 2, 2], 1, 0, 2, "flat-preview")).toEqual([5, 3, 3]);
    expect(attackValues([2, 2, 2], 0, 1, 0, "percentage-preview")).toEqual([2, 2, 2]);
    expect(attackValues([1], 0, 5, 0, "flat-preview")).toEqual([0]);
  });

  it("removes whole random eligible kinds, without drawing randomness for an empty pool", () => {
    const player = fighter({ burn: 7, curse: 1, ward: 9 });
    expect(removeStatuses(player, "cleanse", "one-random", () => 0.99)).toEqual(["curse"]);
    expect([player.burn, player.curse, player.ward]).toEqual([7, 0, 9]);
    expect(
      removeStatuses(player, "cleanse", "all", () => {
        throw Error("unexpected random draw");
      }),
    ).toEqual(["burn"]);
    expect(
      removeStatuses(player, "cleanse", "one-random", () => {
        throw Error("unexpected random draw");
      }),
    ).toEqual([]);
    expect(removeStatuses(player, "purge", "all", () => 0)).toEqual(["ward"]);
  });
});
