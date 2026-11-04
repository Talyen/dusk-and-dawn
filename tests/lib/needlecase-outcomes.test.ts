import { expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun, readRun } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";

const pair = "Iron Needlecase & Empty Needlecase";
function fixture(side: "light" | "dark") {
  const initial = structuredClone(createRun(3).getSnapshot());
  initial.state.deck = [
    { id: "needle", pair },
    { id: "other", pair: "Sun & Moon" },
  ];
  initial.state.zones.hand = initial.state.deck.map((card, index) => ({
    ...card,
    face: index === 0 ? side : ("light" as const),
    kept: false,
  }));
  initial.state.zones.library = [];
  initial.state.zones.discard = [];
  initial.state.zones.banished = [];
  initial.state.enemy.hp = 100;
  initial.state.enemy.maxHp = 100;
  return restoreSession(initial, runHandler);
}

it("deals two Binding hits and keeps its source for a later turn", () => {
  const game = fixture("light");
  expect(cards[pair]!.light.effect).toBe("Deal 2 Binding damage twice. Keep this card.");
  expect(game.dispatch({ type: "play", id: "needle" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.hp).toBe(96);
  expect(game.getSnapshot().state.zones.hand.find((card) => card.id === "needle")).toMatchObject({
    face: "light",
    kept: true,
  });
  expect(game.dispatch({ type: "play", id: "needle" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.hp).toBe(92);
  expect(game.getSnapshot().state.mana).toBe(1);
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.hand.find((card) => card.id === "needle")).toMatchObject({
    face: "light",
    kept: false,
  });
  expect(game.dispatch({ type: "play", id: "needle" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.hp).toBe(88);
});

it("redirects only the first Needlecase hit against Reflect", () => {
  const snapshot = structuredClone(fixture("light").getSnapshot());
  snapshot.state.enemy.reflect = true;
  const game = restoreSession(snapshot, runHandler);
  expect(game.dispatch({ type: "play", id: "needle" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player.hp).toBe(28);
  expect(game.getSnapshot().state.enemy.hp).toBe(98);
  expect(game.getSnapshot().state.enemy.reflect).toBe(false);
  expect(game.getSnapshot().state.zones.hand.find((card) => card.id === "needle")?.kept).toBe(true);
});

it("refunds mana and spends the empty case, including after saving", async () => {
  const game = fixture("dark");
  expect(cards[pair]!.dark.effect).toBe("Gain 1 mana. Banish this card.");
  expect(game.dispatch({ type: "play", id: "needle" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.mana).toBe(3);
  expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["needle"]);
  const loaded = await readRun({
    readCandidates: async () => [encodeRun(game.getSnapshot())],
    write: async () => {},
  });
  expect(loaded).toEqual(game.getSnapshot());
});
