import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { simpleEnemies } from "../../src/lib/game/simple-enemies.generated";

type Operation = {
  op: string;
  amount?: number;
  count?: number;
  damage_type?: string;
  [key: string]: unknown;
};
type Source = {
  id: string;
  name: string;
  health: number;
  weakness: { type: string; direct_card_bonus: number };
  trait: {
    name: string;
    effect: string;
    by_action: Record<string, Operation[]>;
    conditions_by_action: Record<string, string>;
  };
  actions: { id: string; name: string; base: Operation[]; preview: string }[];
  pattern: string[];
};
type Generated = {
  id: string;
  name: string;
  hp: number;
  weakness: string;
  trait: string;
  traitEffect: string;
  actions: {
    name: string;
    text: string;
    hit?: number;
    type?: string;
    ability?: string;
    abilityAmount?: number;
    baseEffect?: Operation;
    traitBonus?: number;
    extraHits?: number[];
    condition?: string;
    effects: Operation[];
  }[];
};

it("maps each reviewed enemy action, trait, condition, weakness, and pattern to its executable definition", () => {
  const source = (
    JSON.parse(readFileSync("docs/Dusk & Dawn — Enemy Mechanics Catalogue v0.1.json", "utf8")) as {
      enemies: Source[];
    }
  ).enemies;
  const generated = simpleEnemies as unknown as readonly Generated[];
  expect(new Set(generated.map((enemy) => enemy.id)).size).toBe(source.length);
  for (const enemy of source) {
    const actual = generated.find((entry) => entry.id === enemy.id);
    expect(actual, enemy.name).toBeDefined();
    expect(actual).toMatchObject({
      name: enemy.name,
      hp: enemy.health,
      weakness: enemy.weakness.type,
      trait: enemy.trait.name,
      traitEffect: enemy.trait.effect,
    });
    expect(enemy.weakness.direct_card_bonus).toBe(2);
    expect(actual!.actions).toHaveLength(enemy.pattern.length);
    enemy.pattern.forEach((actionId, index) => {
      const printed = enemy.actions.find((entry) => entry.id === actionId)!;
      const mapped = actual!.actions[index]!;
      const base = printed.base[0]!;
      const traits = enemy.trait.by_action[actionId] ?? [];
      const bonus = traits.find((op) => op.op === "bonus_damage");
      const extras = traits
        .filter((op) => op.op === "extra_hits")
        .flatMap((op) => Array(op.count!).fill(op.amount));
      const context = `${enemy.name}: ${printed.name}`;
      expect(mapped.name, context).toBe(printed.name);
      expect(mapped.text, context).toBe(printed.preview);
      expect(printed.base, context).toHaveLength(1);
      if (base.op === "damage") {
        expect(base.hits, context).toBe(1);
        expect(mapped.hit, context).toBe(base.amount);
        expect(mapped.type, context).toBe(base.damage_type);
      } else {
        expect(mapped.ability, context).toBe(base.op);
        expect(mapped.baseEffect, context).toEqual(base);
      }
      expect(mapped.traitBonus ?? 0, context).toBe(bonus?.amount ?? 0);
      expect(mapped.extraHits ?? [], context).toEqual(extras);
      expect(mapped.condition, context).toBe(enemy.trait.conditions_by_action[actionId]);
      expect(mapped.effects, context).toEqual(
        traits.filter((op) => op.op !== "bonus_damage" && op.op !== "extra_hits"),
      );
    });
  }
});
