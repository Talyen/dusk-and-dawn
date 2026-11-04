import { describe, expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun, readRun } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";

function fixture(pair: string, face: "light" | "dark", seraph = false) {
  const initial = structuredClone(
    createRun(
      3,
      { id: "reward-test", tier: 1, orientation: "light", relic: seraph ? "ashen-seal" : "none" },
      seraph ? "oathless-seraph" : undefined,
    ).getSnapshot(),
  );
  initial.state.deck = [pair, "Sun & Moon", "Angel & Vampire", "Bloom & Wither", "Ivy & Thorns"].map(
    (entry, i) => ({ id: `card-${i}`, pair: entry }),
  );
  const [source, held, other, first, second] = initial.state.deck.map((card) => ({
    ...card,
    face: "light" as "light" | "dark",
    kept: false,
  }));
  source!.face = face;
  other!.face = "dark";
  other!.kept = true;
  initial.state.zones.hand = [source!, held!, other!];
  initial.state.zones.library = [first!, second!];
  initial.state.zones.discard = [];
  initial.state.zones.banished = [];
  return restoreSession(initial, runHandler);
}

describe("retuned reward pairs", () => {
  it("spends Wax Seal for Ward, including the Seraph and Ashen Seal interactions", async () => {
    expect(cards["Wax Seal & Torn Letter"]!.light.effect).toBe("Gain 7 Ward. Banish this card.");
    const game = fixture("Wax Seal & Torn Letter", "light", true);
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(10);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-0"]);
    expect(game.getSnapshot().state.mana).toBe(2);
    const loaded = await readRun({
      readCandidates: async () => [encodeRun(game.getSnapshot())],
      write: async () => {},
    });
    expect(loaded).toEqual(game.getSnapshot());
  });

  it("loads an existing saved pair and applies its current printed effect", async () => {
    const old = fixture("Wooden Spool & Loose Thread", "light").getSnapshot();
    const loaded = await readRun({ readCandidates: async () => [encodeRun(old)], write: async () => {} });
    expect(loaded).toEqual(old);
    const game = restoreSession(loaded!, runHandler);
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.every((card) => card.kept)).toBe(true);
  });

  it("draws two in library order and Banishes Torn Letter, including an empty library", () => {
    expect(cards["Wax Seal & Torn Letter"]!.dark.effect).toBe("Draw 2 cards. Banish this card.");
    const game = fixture("Wax Seal & Torn Letter", "dark");
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-4",
      "card-3",
    ]);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-0"]);
    const empty = fixture("Wax Seal & Torn Letter", "dark");
    const state = structuredClone(empty.getSnapshot());
    state.state.zones.banished = state.state.zones.library.splice(0);
    const resumed = restoreSession(state, runHandler);
    expect(resumed.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.zones.hand).toHaveLength(2);
    expect(resumed.getSnapshot().state.zones.banished.map((card) => card.id)).toContain("card-0");
  });

  it("keeps the other hand with Wooden Spool while the source goes to discard", () => {
    expect(cards["Wooden Spool & Loose Thread"]!.light.effect).toBe("Keep your hand.");
    const game = fixture("Wooden Spool & Loose Thread", "light");
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((card) => [card.id, card.kept])).toEqual([
      ["card-1", true],
      ["card-2", true],
    ]);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["card-0"]);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(
      game
        .getSnapshot()
        .state.zones.hand.slice(0, 2)
        .map((card) => card.id),
    ).toEqual(["card-1", "card-2"]);
  });

  it("turns the other hand with Loose Thread without turning or Banishing its source", () => {
    expect(cards["Wooden Spool & Loose Thread"]!.dark.effect).toBe("Flip your hand.");
    const game = fixture("Wooden Spool & Loose Thread", "dark");
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((card) => [card.id, card.face, card.kept])).toEqual([
      ["card-1", "dark", false],
      ["card-2", "light", true],
    ]);
    expect(game.getSnapshot().state.zones.discard.map((card) => [card.id, card.face])).toEqual([
      ["card-0", "dark"],
    ]);
    expect(game.getSnapshot().state.zones.banished).toEqual([]);
  });
});
