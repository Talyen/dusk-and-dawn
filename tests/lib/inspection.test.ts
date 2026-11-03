import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import { encodeRun, readRun, resumeRun } from "../../src/lib/game/run-save";

function fixture(pair: string, side: "light" | "dark") {
  const snapshot = structuredClone(createRun(44).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair },
    { id: "bottom", pair: "Sun & Moon" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
    { id: "three", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: side, kept: false }];
  snapshot.state.zones.library = snapshot.state.deck
    .slice(1)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return restoreSession(snapshot, runHandler);
}

it("commits Cartographer before revealing and resumes an ordered choice after saving", async () => {
  const game = fixture("Cartographer & Lost Wanderer", "light");
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  let current = game.getSnapshot();
  expect(current.state.mana).toBe(2);
  expect(current.state.pending?.cards.map((card) => card.id)).toEqual(["three", "two", "one"]);
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(false);
  expect(game.dispatch({ type: "choose", ids: ["one", "one", "two"] }).decision.accepted).toBe(false);
  expect(game.getSnapshot()).toEqual(current);
  const restored = await readRun({ readCandidates: async () => [encodeRun(current)], write: async () => {} });
  const resumed = resumeRun(restored!);
  expect(resumed.dispatch({ type: "choose", ids: ["one", "three", "two"] }).decision.accepted).toBe(true);
  current = resumed.getSnapshot();
  expect(current.state.pending).toBeUndefined();
  expect(current.state.zones.library.map((card) => card.id)).toEqual(["bottom", "two", "three", "one"]);
  expect(current.state.zones.discard.map((card) => card.id)).toEqual(["source"]);
});

it.each([
  ["Walled City & Wilderness", "dark", ["two"], ["two"], ["one", "three", "bottom"], []],
  ["Balance Scales & Loaded Dice", "dark", ["one", "three"], ["three", "one"], ["two", "bottom"], []],
  ["Sieve & Funnel", "light", ["two"], ["two"], [], ["bottom", "one", "three"]],
] as const)("resolves %s while preserving inspected order", (pair, side, chosen, hand, library, discard) => {
  const game = fixture(pair, side);
  game.dispatch({ type: "play", id: "source" });
  expect(game.getSnapshot().state.pending).toBeDefined();
  expect(game.dispatch({ type: "choose", ids: [...chosen] }).decision.accepted).toBe(true);
  const state = game.getSnapshot().state;
  expect(state.zones.hand.map((card) => card.id)).toEqual(hand);
  expect(state.zones.library.map((card) => card.id)).toEqual(library);
  expect(state.zones.discard.map((card) => card.id)).toEqual([...discard, "source"]);
});

it("Sacrifice requires and consumes a chosen other card before its attack", () => {
  const game = fixture("Sacrifice & Self-Preservation", "light");
  const before = game.getSnapshot();
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(false);
  expect(game.getSnapshot()).toEqual(before);
  const setup = structuredClone(before);
  setup.state.zones.hand.push(setup.state.zones.library.pop()!);
  const ready = restoreSession(setup, runHandler);
  expect(ready.dispatch({ type: "play", id: "source", targets: ["three"] }).decision.accepted).toBe(true);
  expect(ready.getSnapshot().state.enemy.hp).toBe(10);
  expect(ready.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["three"]);
});
