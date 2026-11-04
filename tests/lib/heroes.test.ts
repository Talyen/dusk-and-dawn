import { describe, expect, it } from "vitest";
import { heroes, heroIds, heroPassive, type HeroId } from "../../src/lib/game/heroes";
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
      expect(state.heroRuleset).toBe(3);
      expect(state.deck).toHaveLength(10);
      expect(new Set(state.deck.map((card) => card.id)).size).toBe(10);
      for (const pair of heroes[hero].pairs)
        expect(state.deck.filter((card) => card.pair === pair)).toHaveLength(2);
    }
    expect(createRun(19).getSnapshot().state.hero).toBeUndefined();
  });

  it("grants the new Seraph Ward for light support but not direct attacks or dark plays", () => {
    const initial = setup(
      "oathless-seraph",
      ["Sun & Moon", "Cactus Flower & Desert Thorn", "Angel & Vampire", "Key & Lock"],
      ["light", "light", "light", "dark"],
    );
    initial.state.enemy.hp = 100;
    initial.state.enemy.maxHp = 100;
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(0);
    expect(game.dispatch({ type: "play", id: "test-1" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(0);
    expect(game.dispatch({ type: "play", id: "test-2" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(6); // Angel's 5 plus the passive.
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "test-3" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    const dark = restoreSession(setup("oathless-seraph", ["Key & Lock"], ["dark"]), runHandler);
    expect(dark.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(dark.getSnapshot().state.player.ward).toBe(0);
  });

  it("does not grant the new Seraph passive before a reflected direct attack", () => {
    const initial = setup("oathless-seraph", ["Sun & Moon"], ["light"]);
    initial.state.enemy.reflect = true;
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(24);
    expect(game.getSnapshot().state.player.ward).toBe(0);
  });

  it("preserves the old Seraph passive on saved runs, including reflected attacks", async () => {
    const initial = setup("oathless-seraph", ["Sun & Moon"], ["light"]);
    initial.state.heroRuleset = 2;
    initial.state.enemy.reflect = true;
    const resumed = resumeRun(await saved(initial));
    expect(heroPassive("oathless-seraph", resumed.getSnapshot().state.heroRuleset)).toBe(
      "Before each light card resolves, gain 1 Ward.",
    );
    expect(resumed.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.player.hp).toBe(25);
    expect(resumed.getSnapshot().state.player.ward).toBe(0);
    expect((await saved(resumed.getSnapshot())).state.heroRuleset).toBe(2);
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

  it("applies Witch Curse on every dark play, including repeated plays in one turn", async () => {
    const initial = setup("thorn-witch", ["Key & Lock", "Sun & Moon"], ["dark", "light"]);
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy.curse).toBe(1);
    const resumed = resumeRun(await saved(game.getSnapshot()));
    expect(resumed.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.enemy.curse).toBe(2);
    expect(resumed.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.enemy.curse).toBe(3);
    expect(resumed.getSnapshot().state.enemy.poison).toBe(0);
    const before = resumed.getSnapshot();
    expect(resumed.dispatch({ type: "play", id: "test-0" }).decision.accepted).toBe(false);
    expect(resumed.getSnapshot()).toEqual(before);
    expect(resumed.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.player.hp).toBe(29); // Moth's 4 damage is reduced by three Curse.
    expect(resumed.getSnapshot().state.enemy.curse).toBe(0);
  });

  it("preserves the original Poison passive for Witch saves created before ruleset 2", async () => {
    const initial = setup("thorn-witch", ["Key & Lock"], ["dark"]);
    delete initial.state.heroRuleset;
    const resumed = resumeRun(await saved(initial));
    expect(heroPassive("thorn-witch", resumed.getSnapshot().state.heroRuleset)).toContain("2 Poison");
    resumed.dispatch({ type: "play", id: "test-0" });
    resumed.dispatch({ type: "play", id: "test-0" });
    expect(resumed.getSnapshot().state.enemy.poison).toBe(2);
    expect(resumed.getSnapshot().state.enemy.curse).toBe(0);
    expect((await saved(resumed.getSnapshot())).state.heroRuleset).toBeUndefined();
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
      const sun = snapshot.state.deck.find((card) => card.pair === "Sun & Moon") ?? {
        id: "test-sun",
        pair: "Sun & Moon",
      };
      if (!snapshot.state.deck.some((card) => card.id === sun.id)) snapshot.state.deck.push(sun);
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

  it("keeps Sun eligible as a reward for a new Seraph kit", () => {
    const snapshot = structuredClone(createRun(5, undefined, "oathless-seraph").getSnapshot());
    const seraph = snapshot.state.deck.find((card) => card.pair === "Seraph & Fallen Seraph")!;
    snapshot.state.zones.hand = [{ ...seraph, face: "light", kept: false }];
    snapshot.state.enemy.hp = 1;
    let calls = 0;
    const rng = () => (calls++ < 2 ? 0 : 0.999999);
    expect(runHandler(snapshot.state, { type: "play", id: seraph.id }, rng).accepted).toBe(true);
    expect(snapshot.state.offers).toContain("Sun & Moon");
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

it("rejects a ruleset marker without a hero and retains valid fallback saves", async () => {
  const legacy = createRun(29).getSnapshot();
  const invalid = structuredClone(legacy);
  invalid.state.heroRuleset = 2;
  const result = await readRun({
    readCandidates: async () => [encodeRun(invalid), encodeRun(legacy)],
    write: async () => {},
  });
  expect(result).toEqual(legacy);
});
