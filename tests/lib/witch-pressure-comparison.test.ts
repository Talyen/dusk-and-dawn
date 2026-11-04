import { expect, it } from "vitest";
import type { HeroId } from "../../src/lib/game/heroes";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

function comparison(hero: HeroId, enemy: string, hp: number, action: number, leech: boolean) {
  const snapshot = structuredClone(createRun(19, undefined, hero).getSnapshot());
  snapshot.state.encounters![0] = enemy;
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = hp;
  snapshot.state.action = action;
  snapshot.state.player.hp = 20;
  snapshot.state.zones.hand = [
    { id: "first", pair: leech ? "Angel & Vampire" : "Glass Slipper & Iron Boot", face: "dark", kept: false },
    { id: "thorn-a", pair: "Ivy & Thorns", face: "dark", kept: false },
    { id: "thorn-b", pair: "Ivy & Thorns", face: "dark", kept: false },
  ];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  const game = restoreSession(snapshot, runHandler);
  for (const id of ["first", "thorn-a", "thorn-b"])
    expect(game.dispatch({ type: "play", id }).decision.accepted).toBe(true);
  const before = game.getSnapshot().state;
  const healed = before.player.hp;
  const curse = before.enemy.curse;
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
  return { healed, curse, after: game.getSnapshot().state.player.hp };
}

it.each([
  { enemy: "the-brass-cicada", hp: 24, action: 1, healed: 25, witch: 25, other: 19 },
  { enemy: "the-golden-menagerie", hp: 48, action: 1, healed: 25, witch: 25, other: 16 },
  { enemy: "the-threaded-monarch", hp: 36, action: 0, healed: 23, witch: 20, other: 17 },
])("compares the same dark attack hand against $enemy", ({ enemy, hp, action, healed, witch, other }) => {
  for (const hero of ["thorn-witch", "oathless-seraph", "veiled-oracle"] as const) {
    const result = comparison(hero, enemy, hp, action, true);
    expect(result.healed).toBe(healed);
    expect(result.curse).toBe(hero === "thorn-witch" ? 3 : 0);
    expect(result.after).toBe(hero === "thorn-witch" ? witch : other);
  }
});

it.each([
  { enemy: "the-brass-cicada", hp: 24, action: 1, witch: 20, other: 14 },
  { enemy: "the-golden-menagerie", hp: 48, action: 1, witch: 20, other: 11 },
  { enemy: "the-threaded-monarch", hp: 36, action: 0, witch: 17, other: 14 },
])("isolates passive protection without Leech against $enemy", ({ enemy, hp, action, witch, other }) => {
  for (const hero of ["thorn-witch", "oathless-seraph", "veiled-oracle"] as const) {
    const result = comparison(hero, enemy, hp, action, false);
    expect(result.healed).toBe(20);
    expect(result.curse).toBe(hero === "thorn-witch" ? 3 : 0);
    expect(result.after).toBe(hero === "thorn-witch" ? witch : other);
  }
});

it.each([
  { enemy: "radiant-moth", hp: 18, ward: 0, healing: 5, enemyHp: 13 },
  { enemy: "radiant-moth", hp: 18, ward: 5, healing: 5, enemyHp: 18 },
  { enemy: "radiant-moth", hp: 1, ward: 0, healing: 5, enemyHp: 0 },
  { enemy: "the-threaded-monarch", hp: 36, ward: 5, healing: 3, enemyHp: 36 },
])(
  "compares Vampire recovery against $enemy at $hp HP and $ward Ward",
  ({ enemy, hp, ward, healing, enemyHp }) => {
    for (const hero of ["thorn-witch", "oathless-seraph", "veiled-oracle"] as const) {
      const snapshot = structuredClone(createRun(19, undefined, hero).getSnapshot());
      snapshot.state.encounters![0] = enemy;
      snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = hp;
      snapshot.state.enemy.ward = ward;
      snapshot.state.player.hp = 20;
      snapshot.state.zones.hand = [{ id: "vampire", pair: "Angel & Vampire", face: "dark", kept: false }];
      const game = restoreSession(snapshot, runHandler);
      expect(game.dispatch({ type: "play", id: "vampire" }).decision.accepted).toBe(true);
      const state = game.getSnapshot().state;
      expect(state.player.hp).toBe(20 + healing);
      expect(state.enemy.hp).toBe(enemyHp);
      expect(state.enemy.curse).toBe(hero === "thorn-witch" ? 1 : 0);
    }
  },
);
