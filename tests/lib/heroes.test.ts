import { describe, expect, it } from "vitest";
import { heroes, heroIds, type HeroId } from "../../src/lib/game/heroes";
import { createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun, readRun, resumeRun } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";

function setup(hero: HeroId, pairs: string[], faces: ("light" | "dark")[]) {
  const snapshot = structuredClone(createRun(17, undefined, hero).getSnapshot());
  snapshot.state.deck = pairs.map((pair, index) => ({ id: `test-${index}`, pair }));
  snapshot.state.zones.hand = snapshot.state.deck.map((card, index) => ({
    ...card,
    face: faces[index]!,
    kept: false,
  }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

async function saved(snapshot: ReturnType<ReturnType<typeof createRun>["getSnapshot"]>) {
  return (await readRun({ readCandidates: async () => [encodeRun(snapshot)], write: async () => {} }))!;
}

describe("antihero starting kits and passives", () => {
  it("starts each hero with two physical copies of each curated pair, without changing legacy runs", () => {
    for (const hero of heroIds) {
      const state = createRun(19, undefined, hero).getSnapshot().state;
      expect(state.hero).toBe(hero);
      expect(state.deck).toHaveLength(10);
      expect(new Set(state.deck.map((card) => card.id)).size).toBe(10);
      for (const pair of heroes[hero].pairs)
        expect(state.deck.filter((card) => card.pair === pair)).toHaveLength(2);
    }
    expect(createRun(19).getSnapshot().state.hero).toBeUndefined();
  });

  it("grants Seraph Ward before each light effect, and not on dark or rejected plays", () => {
    const initial = setup("oathless-seraph", ["Sun & Moon", "Angel & Vampire"], ["light", "dark"]);
    initial.state.enemy.reflect = true;
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(25); // 1 Ward absorbs the first point of the reflected 6.
    expect(game.getSnapshot().state.player.ward).toBe(0);
    expect(game.dispatch({ type: "play", id: "test-1" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(0);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "missing" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
  });

  it("grants Seraph Ward only once when an inspection is committed, including across save and resume", async () => {
    const initial = setup(
      "oathless-seraph",
      ["Cartographer & Lost Wanderer", "Sun & Moon", "Angel & Vampire", "Bloom & Wither"],
      ["light", "light", "light", "light"],
    );
    initial.state.zones.library = initial.state.zones.hand.splice(1);
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.pending?.kind).toBe("order");
    expect(game.getSnapshot().state.player.ward).toBe(1);
    const resumed = resumeRun(await saved(game.getSnapshot()));
    const ids = resumed.getSnapshot().state.pending!.cards.map((card) => card.id);
    expect(resumed.dispatch({ type: "choose", ids }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.player.ward).toBe(1);
    expect(resumed.getSnapshot().state.hero).toBe("oathless-seraph");
  });

  it("applies Witch Poison on dark plays using the normal maximum rule", () => {
    const initial = setup(
      "thorn-witch",
      ["Sun & Moon", "Angel & Vampire", "Flame & Frost"],
      ["light", "dark", "dark"],
    );
    const game = restoreSession(initial, runHandler);
    game.dispatch({ type: "play", id: "test-0" });
    expect(game.getSnapshot().state.enemy.poison).toBe(0);
    game.dispatch({ type: "play", id: "test-1" });
    expect(game.getSnapshot().state.enemy.poison).toBe(2);
    game.dispatch({ type: "play", id: "test-2" });
    expect(game.getSnapshot().state.enemy.poison).toBe(2);
    const stronger = structuredClone(initial);
    stronger.state.enemy.poison = 4;
    const other = restoreSession(stronger, runHandler);
    other.dispatch({ type: "play", id: "test-1" });
    expect(other.getSnapshot().state.enemy.poison).toBe(4);
  });

  it("starts each Oracle turn with Scry, retains it through saves, and preserves legacy saves", async () => {
    const game = createRun(21, undefined, "veiled-oracle");
    expect(game.getSnapshot().state.zones.scry).toBe(true);
    const restored = resumeRun(await saved(game.getSnapshot()));
    expect(restored.getSnapshot()).toEqual(game.getSnapshot());
    const originalNext = game.dispatch({ type: "end" });
    const restoredNext = restored.dispatch({ type: "end" });
    expect(restoredNext.snapshot).toEqual(originalNext.snapshot);
    expect(restoredNext.snapshot.state.zones.scry).toBe(true);
    expect(restoredNext.snapshot.state.zones.library).toHaveLength(0); // Scry did not refill an empty library.
    const legacy = createRun(21).getSnapshot();
    expect((await saved(legacy)).state.hero).toBeUndefined();
  });

  it("preserves class and passive across fights and honors orientation and relic", async () => {
    const experiment = { id: "hero-run", tier: 1, orientation: "dark", relic: "cracked-vessel" } as const;
    const initial = structuredClone(createRun(22, experiment, "veiled-oracle").getSnapshot());
    expect(initial.state.player.hp).toBe(24);
    expect(initial.state.deck).toHaveLength(11);
    expect(initial.state.zones.hand.every((card) => card.face === "dark")).toBe(true);
    initial.state.phase = "reward";
    initial.state.fight = 1;
    initial.state.offers = [];
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.phase).toBe("rest");
    expect(game.dispatch({ type: "rest" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.hero).toBe("veiled-oracle");
    expect(game.getSnapshot().state.zones.scry).toBe(true);
    expect(game.getSnapshot().state.zones.hand.every((card) => card.face === "dark")).toBe(true);
    expect((await saved(game.getSnapshot())).state.hero).toBe("veiled-oracle");
  });
});

describe("antihero reward pools", () => {
  it("can offer an unowned original starter pair without changing legacy pools", () => {
    for (const hero of [...heroIds, undefined]) {
      const snapshot = structuredClone(createRun(5, undefined, hero).getSnapshot());
      const sun = snapshot.state.deck.find((card) => card.pair === "Sun & Moon")!;
      snapshot.state.zones.hand = [{ ...sun, face: "light", kept: false }];
      snapshot.state.enemy.hp = 1;
      let calls = 0;
      const rng = () => (calls++ === 0 ? 0 : 0.999999);
      expect(runHandler(snapshot.state, { type: "play", id: sun.id }, rng).accepted).toBe(true);
      expect(snapshot.state.phase).toBe("reward");
      expect(snapshot.state.offers.includes("Flame & Frost")).toBe(hero !== undefined);
      expect(
        snapshot.state.offers.every((pair) => !snapshot.state.deck.some((card) => card.pair === pair)),
      ).toBe(true);
    }
  });

  it("can put an absent original pair in an expedition event", () => {
    const experiment = { id: "hero-route", tier: 1, orientation: "light", relic: "none" } as const;
    const snapshot = structuredClone(createRun(5, experiment, "thorn-witch").getSnapshot());
    snapshot.state.phase = "reward";
    snapshot.state.offers = [];
    let calls = 0;
    const rng = () => (calls++ === 0 ? 0 : 0.999999);
    expect(runHandler(snapshot.state, { type: "reward", pair: null }, rng).accepted).toBe(true);
    expect(snapshot.state.experiment?.route?.pair).toBe("Flame & Frost");
  });
});
