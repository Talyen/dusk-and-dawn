import { describe, expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import type { HeroId } from "../../src/lib/game/heroes";

type Scenario = "refund-attacks" | "refund-support" | "attacks";
function controlled(hero: HeroId, ruleset: 3 | 4, enemy: string, action: number, scenario: Scenario) {
  const initial = structuredClone(
    createRun(31, { id: "controlled", tier: 3, orientation: "dark", relic: "none" }, hero).getSnapshot(),
  );
  initial.state.heroRuleset = ruleset;
  initial.state.encounters![0] = enemy;
  initial.state.enemy.hp = 100;
  initial.state.enemy.maxHp = 100;
  initial.state.action = action;
  const pairs =
    scenario === "attacks"
      ? ["Bloom & Wither", "Ivy & Thorns", "Angel & Vampire", "Sun & Moon", "Key & Lock", "Ivy & Thorns"]
      : [
          "Coin Minter & Coin Melter",
          "Clockmaker & Clock Thief",
          ...(scenario === "refund-attacks"
            ? ["Bloom & Wither", "Ivy & Thorns", "Sun & Moon"]
            : ["Key & Lock", "Key & Lock", "Sun & Moon"]),
          "Ivy & Thorns",
        ];
  initial.state.deck = pairs.map((pair, i) => ({ id: `test-${i}`, pair }));
  initial.state.zones.hand = initial.state.deck
    .slice(0, 5)
    .map((card) => ({ ...card, face: "dark", kept: false }));
  initial.state.zones.library = initial.state.deck
    .slice(5)
    .map((card) => ({ ...card, face: "dark", kept: false }));
  initial.state.zones.discard = [];
  initial.state.zones.banished = [];
  const game = restoreSession(initial, runHandler);
  for (let i = 0; i < (scenario === "attacks" ? 3 : 5); i++)
    expect(game.dispatch({ type: "play", id: `test-${i}` }).decision.accepted).toBe(true);
  const before = game.getSnapshot().state;
  const curse = before.enemy.curse;
  const damage = 100 - before.enemy.hp;
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
  return { curse, damage, hpLost: 30 - game.getSnapshot().state.player.hp };
}

describe("Witch passive comparisons", () => {
  it.each([
    ["the-golden-menagerie", 1, 0, 1, 9],
    ["the-threaded-monarch", 0, 1, 4, 6],
    ["the-unseen-horse", 1, 0, 3, 5],
  ])("compares refund and attack sequencing against %s", (enemy, action, oldLoss, newLoss, otherLoss) => {
    expect(controlled("thorn-witch", 3, enemy, action, "refund-attacks")).toEqual({
      curse: 5,
      damage: 11,
      hpLost: oldLoss,
    });
    expect(controlled("thorn-witch", 4, enemy, action, "refund-attacks")).toEqual({
      curse: 2,
      damage: 11,
      hpLost: newLoss,
    });
    for (const hero of ["oathless-seraph", "veiled-oracle"] as const)
      expect(controlled(hero, 4, enemy, action, "refund-attacks")).toEqual({
        curse: 0,
        damage: 11,
        hpLost: otherLoss,
      });
  });

  it("also compares a light support-and-attack line where the Seraph passive matters", () => {
    for (const hero of ["oathless-seraph", "thorn-witch", "veiled-oracle"] as const) {
      const initial = structuredClone(createRun(31, undefined, hero).getSnapshot());
      initial.state.encounters![0] = "the-golden-menagerie";
      initial.state.enemy.hp = 100;
      initial.state.enemy.maxHp = 100;
      initial.state.action = 1;
      initial.state.deck = [
        "Candle & Extinguished Candle",
        "Benediction & Curse",
        "Sun & Moon",
        "Angel & Vampire",
      ].map((pair, i) => ({ id: `light-${i}`, pair }));
      initial.state.zones.hand = initial.state.deck.map((card) => ({ ...card, face: "light", kept: false }));
      initial.state.zones.library = [];
      initial.state.zones.discard = [];
      initial.state.zones.banished = [];
      const game = restoreSession(initial, runHandler);
      for (let i = 0; i < 4; i++)
        expect(game.dispatch({ type: "play", id: `light-${i}` }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.player.ward).toBe(hero === "oathless-seraph" ? 8 : 5);
      expect(game.getSnapshot().state.enemy.hp).toBe(91);
      expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.player.hp).toBe(hero === "oathless-seraph" ? 29 : 26);
    }
  });

  it("exposes the old no-damage stall and the remaining three-attack multi-hit interaction", () => {
    expect(controlled("thorn-witch", 3, "the-golden-menagerie", 1, "refund-support")).toEqual({
      curse: 5,
      damage: 0,
      hpLost: 0,
    });
    expect(controlled("thorn-witch", 4, "the-golden-menagerie", 1, "refund-support")).toEqual({
      curse: 0,
      damage: 0,
      hpLost: 9,
    });
    expect(controlled("thorn-witch", 4, "the-golden-menagerie", 1, "attacks")).toEqual({
      curse: 3,
      damage: 16,
      hpLost: 0,
    });
  });
});
