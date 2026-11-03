import { expect, it } from "vitest";
import { createRun, enemyAttackHits, getEnemy, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import type { FightCard } from "../../src/lib/game/card-zones";

const card = (
  id: string,
  pair = "Sun & Moon",
  face: "light" | "dark" = "light",
  kept = false,
): FightCard => ({ id, pair, face, kept });
function cardGame(source: FightCard, hand: FightCard[], discard: FightCard[]) {
  const snapshot = structuredClone(createRun(5).getSnapshot());
  snapshot.state.zones.hand = [source, ...hand];
  snapshot.state.zones.discard = discard;
  snapshot.state.zones.library = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("returns only the top discard card that fits and banishes the source", () => {
  const source = card("doll", "Porcelain Doll & Rag Doll", "dark");
  const setup = cardGame(
    source,
    Array.from({ length: 7 }, (_, i) => card(`held-${i}`)),
    [card("bottom"), card("top", "Angel & Vampire", "dark")],
  );
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
  const zones = game.getSnapshot().state.zones;
  expect(zones.hand).toHaveLength(8);
  expect(zones.hand.at(-1)).toEqual(card("top", "Angel & Vampire", "dark"));
  expect(zones.discard.map((item) => item.id)).toEqual(["bottom"]);
  expect(zones.banished.map((item) => item.id)).toEqual(["doll"]);
});

it("exchanges the original kept card with discard top, clears Keep and preserves faces", () => {
  const source = card("causeway", "Tidal Causeway & Drifting Island");
  const setup = cardGame(
    source,
    [card("outgoing", "Sun & Moon", "dark", true)],
    [card("bottom"), card("incoming", "Angel & Vampire", "dark")],
  );
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
  const zones = game.getSnapshot().state.zones;
  expect(zones.hand).toEqual([card("incoming", "Angel & Vampire", "dark")]);
  expect(zones.discard).toEqual([card("bottom"), card("outgoing", "Sun & Moon", "dark"), source]);
});

it("cleanses exactly one harmful kind, caps healing, and banishes the source", () => {
  const source = card("abbess", "Abbess & Vampire Countess");
  const setup = cardGame(source, [], []);
  Object.assign(setup.state.player, { hp: 28, burn: 3, poison: 4, curse: 2, ward: 5 });
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
  const { player, zones } = game.getSnapshot().state;
  expect([player.burn, player.poison, player.curse].filter((value) => value === 0)).toHaveLength(1);
  expect([player.burn, player.poison, player.curse].filter((value) => value > 0)).toHaveLength(2);
  expect(player.hp).toBe(30);
  expect(player.ward).toBe(5);
  expect(zones.banished.map((item) => item.id)).toEqual(["abbess"]);
});

it("purges all beneficial enemy statuses without removing harmful ones", () => {
  const source = card("exposure", "Exposure & Concealment");
  const setup = cardGame(source, [], []);
  Object.assign(setup.state.enemy, { ward: 5, bless: 2, reflect: true, burn: 3, curse: 1, freeze: true });
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy).toMatchObject({
    ward: 0,
    bless: 0,
    reflect: false,
    burn: 3,
    curse: 1,
    freeze: true,
  });
});

it("banishes the library top during a full kept hand and Hush skips the ability", () => {
  const setup = structuredClone(createRun(9).getSnapshot());
  setup.state.encounters = ["hollow-king", "fixture:0", "fixture:0", "fixture:0", "fixture:4"];
  setup.state.action = 1;
  setup.state.zones.hand = Array.from({ length: 8 }, (_, i) =>
    card(`held-${i}`, "Sun & Moon", "light", true),
  );
  setup.state.zones.library = [card("bottom"), card("top", "Angel & Vampire", "dark")];
  setup.state.zones.discard = [];
  setup.state.zones.banished = [];
  const game = restoreSession(setup, runHandler);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.zones.banished).toEqual([card("top", "Angel & Vampire", "dark")]);
  expect(game.getSnapshot().state.zones.library.map((item) => item.id)).toEqual(["bottom"]);
  expect(game.getSnapshot().state.zones.hand).toHaveLength(8);
  const hushed = structuredClone(setup);
  hushed.state.enemy.hush = true;
  const muted = restoreSession(hushed, runHandler);
  muted.dispatch({ type: "end" });
  expect(muted.getSnapshot().state.zones.banished).toHaveLength(0);
  expect(muted.getSnapshot().state.zones.library.map((item) => item.id)).toEqual(["bottom", "top"]);
});

it("ticks Burn before Freeze skips and advances the enemy action", () => {
  const setup = structuredClone(createRun(9).getSnapshot());
  setup.state.action = 1;
  setup.state.enemy.burn = 1;
  setup.state.enemy.freeze = true;
  const game = restoreSession(setup, runHandler);
  game.dispatch({ type: "end" });
  const state = game.getSnapshot().state;
  expect(state.enemy.hp).toBe(17);
  expect(state.enemy.burn).toBe(0);
  expect(state.enemy.freeze).toBe(false);
  expect(state.player.hp).toBe(30);
  expect(state.action).toBe(0);
});

it("clamps the Raven copied attack and Hush restores its base hit", () => {
  const setup = structuredClone(createRun(9).getSnapshot());
  setup.state.encounters = ["the-painted-raven", "fixture:0", "fixture:0", "fixture:0", "fixture:4"];
  setup.state.action = 1;
  const action = getEnemy(setup.state).actions[1]!;
  expect(enemyAttackHits(action, false)).toEqual([3]);
  expect(enemyAttackHits(action, false, 0)).toEqual([3]);
  expect(enemyAttackHits(action, false, 6)).toEqual([6]);
  expect(enemyAttackHits(action, false, 99)).toEqual([8]);
  expect(enemyAttackHits(action, true, 8)).toEqual([3]);
});
