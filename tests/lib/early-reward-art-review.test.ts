import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

function setup(face: "light" | "dark") {
  const snapshot = structuredClone(createRun(17).getSnapshot());
  snapshot.state.encounters![0] = "the-velvet-mole";
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = 24;
  snapshot.state.player.hp = 20;
  snapshot.state.action = 1;
  snapshot.state.zones.hand = [{ id: "scribe", pair: "Parchment Scribe & Ink Drinker", face, kept: false }];
  snapshot.state.zones.library = [{ id: "library", pair: "Key & Lock", face: "light", kept: false }];
  snapshot.state.zones.discard = [
    { id: "oldest", pair: "Sun & Moon", face: "light", kept: false },
    { id: "newest", pair: "Angel & Vampire", face: "dark", kept: false },
  ];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("the Scribe prepares the oldest discard, while the Ink Drinker spends the newest for healing", () => {
  const scribe = restoreSession(setup("light"), runHandler);
  expect(scribe.dispatch({ type: "play", id: "scribe" }).decision.accepted).toBe(true);
  expect(scribe.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["library", "oldest"]);
  expect(scribe.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["newest", "scribe"]);
  expect(scribe.getSnapshot().state.player.hp).toBe(20);

  const drinker = restoreSession(setup("dark"), runHandler);
  expect(drinker.dispatch({ type: "play", id: "scribe" }).decision.accepted).toBe(true);
  expect(drinker.getSnapshot().state.player.hp).toBe(23);
  expect(drinker.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["oldest"]);
  expect(drinker.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["newest", "scribe"]);
});

it("Ink Drinker cannot consume itself or heal when the discard pile is empty", () => {
  const empty = setup("dark");
  empty.state.zones.discard = [];
  const game = restoreSession(empty, runHandler);
  expect(game.dispatch({ type: "play", id: "scribe" }).decision.accepted).toBe(false);
  const result = game.getSnapshot().state;
  expect(result.player.hp).toBe(20);
  expect(result.mana).toBe(3);
  expect(result.zones.hand.map((card) => card.id)).toEqual(["scribe"]);
  expect(result.zones.banished).toEqual([]);
});

it("the Mole's tunnel bypasses Ward, but Hush suppresses that trait", () => {
  for (const hush of [false, true]) {
    const snapshot = setup("light");
    snapshot.state.enemy.hush = hush;
    snapshot.state.player.ward = 5;
    const game = restoreSession(snapshot, runHandler);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(hush ? 20 : 16);
    expect(result.player.ward).toBe(hush ? 0 : 2);
  }
});
