import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import type { FightCard } from "../../src/lib/game/card-zones";

const c = (id: string, face: "light" | "dark" = "light", kept = false): FightCard => ({
  id,
  pair: "Sun & Moon",
  face,
  kept,
});
function fixture(
  pair: string,
  side: "light" | "dark",
  held: FightCard[] = [],
  library: FightCard[] = [],
  discard: FightCard[] = [],
) {
  const snapshot = structuredClone(createRun(6).getSnapshot());
  snapshot.state.zones.hand = [{ id: "source", pair, face: side, kept: false }, ...held];
  snapshot.state.zones.library = library;
  snapshot.state.zones.discard = discard;
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = false;
  return snapshot;
}

it("Imp attacks before flipping its only other held card", () => {
  const game = restoreSession(fixture("Cherub & Imp", "dark", [c("other", "light", true)]), runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.hp).toBe(12); // 4 Shadow plus the Moth's weakness
  expect(game.getSnapshot().state.zones.hand).toEqual([c("other", "dark", true)]);
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
});

it("Rain clears both Burns, heals, and preserves unrelated statuses", () => {
  const setup = fixture("Rain & Drought", "light");
  Object.assign(setup.state.player, { hp: 28, burn: 4, poison: 3 });
  Object.assign(setup.state.enemy, { burn: 5, poison: 2 });
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player).toMatchObject({ hp: 30, burn: 0, poison: 3 });
  expect(game.getSnapshot().state.enemy).toMatchObject({ burn: 0, poison: 2 });
  expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["source"]);
});

it("Extinguished Candle and Lantern Snuffer turn other held cards dark while preserving Keep", () => {
  for (const [pair, removesBurn] of [
    ["Candle & Extinguished Candle", false],
    ["Lantern Lighter & Lantern Snuffer", true],
  ] as const) {
    const setup = fixture(pair, "dark", [c("light", "light", true), c("dark", "dark")]);
    setup.state.player.burn = 4;
    setup.state.enemy.burn = 3;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, pair).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.hand).toEqual([c("light", "dark", true), c("dark", "dark")]);
    expect([state.player.burn, state.enemy.burn]).toEqual(removesBurn ? [0, 0] : [4, 3]);
    expect(state.zones.banished.some((card) => card.id === "source")).toBe(!removesBurn);
  }
});

it("Lost Wanderer shuffles only the library before drawing, leaving retained cards untouched", () => {
  const setup = fixture(
    "Cartographer & Lost Wanderer",
    "dark",
    [c("held", "dark", true)],
    [c("a"), c("b", "dark")],
    [c("discard")],
  );
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  const zones = game.getSnapshot().state.zones;
  expect(zones.hand[0]).toEqual(c("held", "dark", true));
  expect(
    zones.hand
      .slice(1)
      .map((card) => card.id)
      .sort(),
  ).toEqual(["a", "b"]);
  expect(zones.library).toEqual([]);
  expect(zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
});

it("Chessboard Scries without reshuffling and adds Curse", () => {
  const setup = fixture("Chessboard & Scattered Chess Pieces", "light", [], [], [c("discard")]);
  setup.state.enemy.curse = 2;
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.curse).toBe(3);
  expect(game.getSnapshot().state.zones).toMatchObject({ library: [], scry: true });
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
});

it("Solitude banishes all other held cards, clearing Keep, and still works with no others", () => {
  const setup = fixture("Multiplicity & Solitude", "dark", [c("a", "dark", true), c("b")]);
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.hand).toEqual([]);
  expect(game.getSnapshot().state.zones.banished).toEqual([c("a", "dark"), c("b")]);
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  const empty = restoreSession(fixture("Multiplicity & Solitude", "dark"), runHandler);
  expect(empty.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
});

it("Low Tide moves the top to the bottom, then reveals the new top", () => {
  const setup = fixture(
    "High Tide & Low Tide",
    "dark",
    [],
    [c("bottom"), c("middle"), c("top", "dark")],
    [c("discard")],
  );
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.library).toEqual([c("top", "dark"), c("bottom"), c("middle")]);
  expect(game.getSnapshot().state.zones.scry).toBe(true);
  expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
});

it("Chimney Sweep removes Burn even when no discard target exists", () => {
  for (const discard of [[], [c("bottom"), c("top", "dark")]]) {
    const setup = fixture("Chimney Sweep & Smoke Spirit", "light", [], [], discard);
    setup.state.player.burn = 5;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.burn).toBe(0);
    expect(game.getSnapshot().state.zones.banished).toEqual(discard.length ? [c("top", "dark")] : []);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(
      discard.length ? ["bottom", "source"] : ["source"],
    );
  }
});

it.each([
  ["Beehive Palace & Termite Palace", 6, false],
  ["Stone Mason & Stone Eater", 4, true],
] as const)("%s removes only available enemy Ward", (pair, amount, heals) => {
  for (const ward of [2, 10]) {
    const setup = fixture(pair, "dark");
    setup.state.player.hp = 28;
    setup.state.enemy.ward = ward;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy.ward).toBe(Math.max(0, ward - amount));
    expect(game.getSnapshot().state.player.hp).toBe(heals ? 30 : 28);
    expect(game.getSnapshot().state.zones.banished.some((card) => card.id === "source")).toBe(heals);
  }
});

it("Path Eraser prepares an empty library and has no required payment when both piles are empty", () => {
  for (const discard of [[], [c("only", "dark")]]) {
    const game = restoreSession(fixture("Path Maker & Path Eraser", "dark", [], [], discard), runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.banished).toEqual(discard);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  }
});

it("Day and Night Moth turn only a card currently on the eligible face", () => {
  for (const [side, from, to] of [
    ["light", "dark", "light"],
    ["dark", "light", "dark"],
  ] as const) {
    const game = restoreSession(
      fixture("Day Moth & Night Moth", side, [c("eligible", from, true), c("other", to)]),
      runHandler,
    );
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toEqual([c("eligible", to, true), c("other", to)]);
    const noEligible = restoreSession(fixture("Day Moth & Night Moth", side, [c("other", to)]), runHandler);
    const random = noEligible.getSnapshot().random;
    expect(noEligible.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(noEligible.getSnapshot().random).toEqual(random);
  }
});

it("Memory may resolve an empty discard, while Sacrifice rejects an invalid payment without spending", () => {
  const memory = restoreSession(fixture("Memory & Oblivion", "light"), runHandler);
  expect(memory.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(memory.getSnapshot().state.zones.hand).toEqual([]);
  expect(memory.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["source"]);
  expect(memory.getSnapshot().state.mana).toBe(2);
  const sacrifice = restoreSession(
    fixture("Sacrifice & Self-Preservation", "light", [c("held")]),
    runHandler,
  );
  const before = sacrifice.getSnapshot();
  expect(sacrifice.dispatch({ type: "play", id: "source", targets: ["source"] }).decision.accepted).toBe(
    false,
  );
  expect(sacrifice.getSnapshot()).toEqual(before);
});

it("Ice Crystal rejects a second Freeze without spending mana or randomness", () => {
  const setup = fixture("Ice Crystal & Salt Crystal", "light");
  setup.state.enemy.freeze = true;
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(false);
  expect(game.getSnapshot()).toEqual(setup);
});

it("draw-then-discard faces resolve even when nothing can be drawn or discarded", () => {
  for (const pair of [
    "Symmetry & Asymmetry",
    "Fortune Teller & Fortune Gambler",
    "Music Conductor & Improviser",
  ]) {
    const game = restoreSession(fixture(pair, "dark"), runHandler);
    const random = game.getSnapshot().random;
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, pair).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toEqual([]);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
    expect(game.getSnapshot().random).toEqual(random);
  }
});
