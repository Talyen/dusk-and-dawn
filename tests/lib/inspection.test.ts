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

it.each([
  ["Cartographer & Lost Wanderer", "light"],
  ["Walled City & Wilderness", "dark"],
  ["Sieve & Funnel", "light"],
] as const)("automatically resolves %s with one available library card", (pair, side) => {
  const initial = structuredClone(fixture(pair, side).getSnapshot());
  initial.state.zones.library = [{ id: "only", pair: "Sun & Moon", face: "dark", kept: false }];
  initial.state.zones.discard = [{ id: "discard", pair: "Angel & Vampire", face: "light", kept: false }];
  const game = restoreSession(initial, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  const state = game.getSnapshot().state;
  expect(state.pending).toBeUndefined();
  expect(state.mana).toBe(2);
  if (pair.startsWith("Cartographer")) {
    expect(state.zones.library.map((card) => card.id)).toEqual(["only"]);
    expect(state.zones.hand).toEqual([]);
  } else {
    expect(state.zones.hand.map((card) => card.id)).toEqual(["only"]);
    expect(state.zones.library).toEqual([]);
  }
  expect(state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
});

it("Loaded Dice requests only what fits and preserves the remainder's library order", () => {
  const setup = structuredClone(fixture("Balance Scales & Loaded Dice", "dark").getSnapshot());
  setup.state.zones.hand.push(
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `held-${index}`,
      pair: "Sun & Moon",
      face: "light" as const,
      kept: false,
    })),
  );
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.pending).toMatchObject({ kind: "select-bottom", required: 1 });
  expect(game.getSnapshot().state.pending?.cards.map((card) => card.id)).toEqual(["three", "two", "one"]);
  expect(game.dispatch({ type: "choose", ids: ["two"] }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.hand).toHaveLength(8);
  expect(game.getSnapshot().state.zones.hand.at(-1)?.id).toBe("two");
  expect(game.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["one", "three", "bottom"]);
});

it("Cartographer does not reshuffle discard midway through an incomplete inspection", () => {
  const setup = structuredClone(fixture("Cartographer & Lost Wanderer", "light").getSnapshot());
  setup.state.zones.library = [
    { id: "bottom", pair: "Sun & Moon", face: "light", kept: false },
    { id: "top", pair: "Angel & Vampire", face: "dark", kept: false },
  ];
  setup.state.zones.discard = [{ id: "discard", pair: "Flame & Frost", face: "light", kept: false }];
  const game = restoreSession(setup, runHandler);
  game.dispatch({ type: "play", id: "source" });
  expect(game.getSnapshot().state.pending?.cards.map((card) => card.id)).toEqual(["top", "bottom"]);
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["discard"]);
  expect(game.dispatch({ type: "choose", ids: ["bottom", "top"] }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["top", "bottom"]);
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
});
