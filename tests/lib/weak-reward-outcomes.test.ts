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

  it("Deer Trail draws before flipping the other hand, including the drawn card", () => {
    const pair = "Paved Road & Deer Trail";
    expect(cards[pair]!.light.effect).toBe("Scry. Draw 1 card.");
    expect(cards[pair]!.dark.effect).toBe("Draw 1 card. Flip your hand.");
    const game = fixture(pair, "dark");
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((card) => [card.id, card.face, card.kept])).toEqual([
      ["card-1", "dark", false],
      ["card-2", "light", true],
      ["card-4", "dark", false],
    ]);
    expect(game.getSnapshot().state.zones.discard.map((card) => [card.id, card.face])).toEqual([
      ["card-0", "dark"],
    ]);
    expect(game.getSnapshot().state.zones.scry).toBe(false);
  });

  it("Fern unfolds into two cards while Fallen Leaf draws once and leaves the fight", async () => {
    const pair = "Fern Fiddlehead & Fallen Leaf";
    expect(cards[pair]!.light.effect).toBe("Draw 2 cards.");
    expect(cards[pair]!.dark.effect).toBe("Draw 1 card. Banish this card.");
    const fern = fixture(pair, "light");
    expect(fern.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(fern.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-4",
      "card-3",
    ]);
    expect(fern.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["card-0"]);
    const leaf = fixture(pair, "dark");
    const loaded = await readRun({
      readCandidates: async () => [encodeRun(leaf.getSnapshot())],
      write: async () => {},
    });
    const resumed = restoreSession(loaded!, runHandler);
    expect(resumed.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual([
      "card-1",
      "card-2",
      "card-4",
    ]);
    expect(resumed.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-0"]);
    expect(resumed.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["card-3"]);
  });

  it("Flower Bud keeps the hand, and flipping those cards preserves Keep until the turn ends", async () => {
    const pair = "Flower Bud & Seed Pod";
    expect(cards[pair]!.light.effect).toBe("Keep your hand.");
    expect(cards[pair]!.dark.effect).toBe("Draw 2 cards.");
    const initial = structuredClone(fixture(pair, "light").getSnapshot());
    initial.state.deck[3]!.pair = "Sun & Moon";
    const moon = initial.state.zones.library.find((card) => card.id === "card-3")!;
    moon.pair = "Sun & Moon";
    moon.face = "dark";
    initial.state.zones.library = initial.state.zones.library.filter((card) => card.id !== "card-3");
    initial.state.zones.hand.push(moon);
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.every((card) => card.kept)).toBe(true);
    expect(game.dispatch({ type: "play", id: "card-3" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((card) => [card.id, card.face, card.kept])).toEqual([
      ["card-1", "dark", true],
      ["card-2", "light", true],
    ]);
    const loaded = await readRun({
      readCandidates: async () => [encodeRun(game.getSnapshot())],
      write: async () => {},
    });
    const resumed = restoreSession(loaded!, runHandler);
    expect(resumed.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.zones.hand.find((card) => card.id === "card-1")).toMatchObject({
      face: "dark",
      kept: false,
    });
    expect(resumed.getSnapshot().state.zones.hand.find((card) => card.id === "card-2")).toMatchObject({
      face: "light",
      kept: false,
    });
  });

  it("a full hand keeps Water Clock when no card can be drawn", () => {
    const initial = structuredClone(fixture("Sundial & Water Clock", "dark").getSnapshot());
    initial.state.zones.banished = initial.state.zones.library.splice(0);
    for (let i = 0; i < 5; i++) {
      const extra = { id: `extra-${i}`, pair: "Sun & Moon" };
      initial.state.deck.push(extra);
      initial.state.zones.hand.push({ ...extra, face: "light", kept: false });
    }
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toHaveLength(8);
    expect(game.getSnapshot().state.zones.hand.find((card) => card.id === "card-0")).toMatchObject({
      face: "dark",
      kept: true,
    });
    expect(game.getSnapshot().state.zones.discard).toEqual([]);
  });
});

it("the watchtower scouts while its collapsing face strikes and is spent", async () => {
  const pair = "Watchtower & Collapsed Watchtower";
  expect(cards[pair]!.light.effect).toBe("Scry. Draw 1 card.");
  expect(cards[pair]!.dark.effect).toBe("Deal 6 Decay damage. Banish this card.");
  const scout = fixture(pair, "light");
  expect(scout.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
  expect(scout.getSnapshot().state.zones.scry).toBe(true);
  expect(scout.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual(["card-1", "card-2", "card-4"]);
  expect(scout.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["card-0"]);

  const oldSave = structuredClone(fixture(pair, "dark").getSnapshot());
  oldSave.state.encounters![0] = "the-bellflower-magistrate"; // Weak to Decay.
  oldSave.state.enemy.hp = oldSave.state.enemy.maxHp = 28;
  oldSave.state.enemy.ward = 2;
  const loaded = await readRun({ readCandidates: async () => [encodeRun(oldSave)], write: async () => {} });
  expect(loaded).toEqual(oldSave);
  const impact = restoreSession(loaded!, runHandler);
  expect(impact.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
  expect(impact.getSnapshot().state.enemy).toMatchObject({ hp: 22, ward: 0, curse: 0 });
  expect(impact.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-0"]);
  expect(impact.getSnapshot().state.mana).toBe(2);
  const neutral = structuredClone(oldSave);
  neutral.state.encounters![0] = "the-fogbound-weaver"; // Weak to Release, not Decay.
  const againstWeaver = restoreSession(neutral, runHandler);
  expect(againstWeaver.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
  expect(againstWeaver.getSnapshot().state.enemy).toMatchObject({ hp: 24, ward: 0 });
});
