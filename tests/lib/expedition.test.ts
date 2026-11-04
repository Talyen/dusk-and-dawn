import { describe, expect, it } from "vitest";
import { createRun, getEnemy, runHandler, type ExperimentOptions } from "../../src/lib/game/run";
import { encodeRun, readRunWithRecovery } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";
import { readProgression, recordExpedition, unlockTier } from "../../src/lib/game/progression";

const options: ExperimentOptions = { id: "run-1", tier: 1, orientation: "light", relic: "none" };
function routeGame(relic: ExperimentOptions["relic"] = "none") {
  const snapshot = structuredClone(createRun(50, { ...options, relic }).getSnapshot());
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  const game = restoreSession(snapshot, runHandler);
  expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
  const legacy = structuredClone(game.getSnapshot());
  delete legacy.state.experiment!.route!.event;
  delete legacy.state.experiment!.lastEvent;
  return restoreSession(legacy, runHandler);
}

describe("experimental expeditions", () => {
  it("keeps route choices reproducible, legal, and resumable", async () => {
    const game = routeGame();
    expect(game.getSnapshot().state.phase).toBe("route");
    const encoded = encodeRun(game.getSnapshot());
    const restored = await readRunWithRecovery({
      readCandidates: async () => [encoded],
      write: async () => {},
    });
    expect(restored?.snapshot).toEqual(game.getSnapshot());
    const resumed = restoreSession(restored!.snapshot, runHandler);
    const pair = resumed.getSnapshot().state.experiment!.route!.pair;
    expect(resumed.dispatch({ type: "route", choice: "event" }).decision.accepted).toBe(true);
    expect(resumed.getSnapshot().state.player.hp).toBe(26);
    expect(resumed.getSnapshot().state.deck.some((card) => card.pair === pair)).toBe(true);
    expect(resumed.getSnapshot().state.fight).toBe(1);
    expect(resumed.getSnapshot().state.experiment!.route).toBeUndefined();
  });
  it("heals at a rest path and rejects an event the player cannot afford", () => {
    const initial = structuredClone(routeGame().getSnapshot());
    initial.state.player.hp = 4;
    const game = restoreSession(initial, runHandler);
    const rejected = game.dispatch({ type: "route", choice: "event" });
    expect(rejected.decision.accepted).toBe(false);
    expect(rejected.snapshot).toEqual(initial);
    expect(game.dispatch({ type: "route", choice: "rest" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(8);
    expect(game.getSnapshot().state.fight).toBe(1);
  });
  it("does not repeat a completed detour after saving and resuming its reward", async () => {
    const initial = structuredClone(createRun(45, options).getSnapshot());
    initial.state.phase = "reward";
    initial.state.offers = [];
    let game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    const first = game.getSnapshot().state.experiment!.route!.enemy;
    expect(first).toBe("the-bone-cartographer");
    expect(game.dispatch({ type: "route", choice: "combat" }).decision.accepted).toBe(true);
    const battle = structuredClone(game.getSnapshot());
    battle.state.enemy.hp = 1;
    const source = [...battle.state.zones.hand, ...battle.state.zones.library].find(
      (card) => card.pair === "Sun & Moon",
    )!;
    if (!battle.state.zones.hand.some((card) => card.id === source.id)) {
      battle.state.zones.library = battle.state.zones.library.filter((card) => card.id !== source.id);
      battle.state.zones.hand.push(source);
    }
    game = restoreSession(battle, runHandler);
    expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
    const detourReward = game.getSnapshot();
    expect(detourReward.state.phase).toBe("reward");
    expect(detourReward.state.experiment!.route).toMatchObject({ active: true, enemy: first });
    expect(detourReward.state.experiment!.lastDetour).toBeUndefined();
    const oldSave = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(detourReward)],
      write: async () => {},
    });
    expect(oldSave?.snapshot).toEqual(detourReward);
    game = restoreSession(oldSave!.snapshot, runHandler);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.experiment!.lastDetour).toBe(first);
    const resumed = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(game.getSnapshot())],
      write: async () => {},
    });
    expect(resumed?.snapshot).toEqual(game.getSnapshot());
    const later = structuredClone(resumed!.snapshot);
    later.state.fight = 2;
    later.state.phase = "reward";
    later.state.offers = [];
    later.state.action = 0;
    game = restoreSession(later, runHandler);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    const next = game.getSnapshot();
    expect(next.state.experiment!.route!.enemy).not.toBe(first);
    expect(next.state.encounters).not.toContain(next.state.experiment!.route!.enemy);
    const routeSave = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(next)],
      write: async () => {},
    });
    expect(routeSave?.snapshot).toEqual(next);
  });
  it("does not record an unchosen combat as a completed detour", () => {
    const game = routeGame();
    expect(game.dispatch({ type: "route", choice: "rest" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.experiment!.lastDetour).toBeUndefined();
  });
  it("rejects an unknown saved detour without rejecting older saves", async () => {
    const original = createRun(45, options).getSnapshot();
    expect(
      (
        await readRunWithRecovery({
          readCandidates: async () => [encodeRun(original)],
          write: async () => {},
        })
      )?.snapshot,
    ).toEqual(original);
    const bad = structuredClone(original);
    bad.state.experiment!.lastDetour = "unknown-enemy";
    await expect(
      readRunWithRecovery({ readCandidates: async () => [encodeRun(bad)], write: async () => {} }),
    ).rejects.toThrow();
  });
  it("offers varied events without repeating the previous route's event", () => {
    const firstEvents = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const initial = structuredClone(createRun(seed, options).getSnapshot());
      initial.state.phase = "reward";
      initial.state.offers = [];
      let game = restoreSession(initial, runHandler);
      expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
      const first = game.getSnapshot().state.experiment!.route!.event!;
      firstEvents.add(first);
      expect(game.dispatch({ type: "route", choice: "rest" }).decision.accepted).toBe(true);
      const later = structuredClone(game.getSnapshot());
      later.state.fight = 2;
      later.state.phase = "reward";
      later.state.offers = [];
      game = restoreSession(later, runHandler);
      expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.experiment!.route!.event).not.toBe(first);
    }
    expect(firstEvents).toEqual(new Set(["blood", "thorns", "lantern", "exchange", "sanctuary"]));
  });
  for (const event of ["blood", "thorns", "lantern"] as const) {
    it(`previews, saves, and resolves the ${event} event once`, async () => {
      const initial = structuredClone(routeGame().getSnapshot());
      initial.state.experiment!.route!.event = event;
      initial.state.experiment!.lastEvent = event;
      const pair = initial.state.experiment!.route!.pair;
      const encoded = encodeRun(initial);
      const loaded = await readRunWithRecovery({
        readCandidates: async () => [encoded],
        write: async () => {},
      });
      expect(loaded?.snapshot).toEqual(initial);
      let game = restoreSession(loaded!.snapshot, runHandler);
      expect(game.dispatch({ type: "route", choice: "event" }).decision.accepted).toBe(true);
      const after = game.getSnapshot();
      expect(after.state.fight).toBe(1);
      expect(after.state.experiment!.route).toBeUndefined();
      expect(after.state.deck.filter((card) => card.pair === pair)).toHaveLength(1);
      expect(after.state.player.hp).toBe(event === "blood" ? 26 : 30);
      expect(after.state.player.poison).toBe(event === "thorns" ? 4 : 0);
      expect(after.state.mana).toBe(event === "lantern" ? 2 : 3);
      const saved = encodeRun(after);
      const resumed = await readRunWithRecovery({
        readCandidates: async () => [saved],
        write: async () => {},
      });
      expect(resumed?.snapshot).toEqual(after);
      game = restoreSession(resumed!.snapshot, runHandler);
      expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.player.poison).toBe(event === "thorns" ? 2 : 0);
      expect(game.getSnapshot().state.mana).toBe(3);
    });
  }
  it.each([1, 20, 29, 30])("heals and starts with less mana at the sanctuary from %i HP", async (hp) => {
    const initial = structuredClone(routeGame().getSnapshot());
    initial.state.experiment!.route!.event = "sanctuary";
    initial.state.experiment!.lastEvent = "sanctuary";
    initial.state.player.hp = hp;
    const game = restoreSession(initial, runHandler);
    const rest = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "route", choice: "event" }).decision.accepted).toBe(true);
    expect(rest.dispatch({ type: "route", choice: "rest" }).decision.accepted).toBe(true);
    const result = game.getSnapshot();
    expect(result.state.player.hp).toBe(Math.min(30, hp + 7));
    expect(rest.getSnapshot().state.player.hp).toBe(Math.min(30, hp + 4));
    expect(result.state.mana).toBe(2);
    expect(rest.getSnapshot().state.mana).toBe(3);
    expect(result.state.deck).toEqual(initial.state.deck);
    expect(result.state.zones).toEqual(rest.getSnapshot().state.zones);
    expect(result.random).toEqual(rest.getSnapshot().random);
    const resumed = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(result)],
      write: async () => {},
    });
    expect(resumed?.snapshot).toEqual(result);
  });
  it("saves and cancels an exchange without changing the deck or randomness, then swaps exactly one card", async () => {
    const initial = structuredClone(routeGame().getSnapshot());
    initial.state.experiment!.route!.event = "exchange";
    initial.state.experiment!.lastEvent = "exchange";
    initial.state.player.hp = 4;
    const incoming = initial.state.experiment!.route!.pair;
    const outgoing = initial.state.deck[0]!;
    let game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "route", choice: "event" }).decision.accepted).toBe(true);
    const pending = game.getSnapshot();
    expect(pending.state.experiment!.route!.selecting).toBe(true);
    expect(pending.state.deck).toEqual(initial.state.deck);
    expect(pending.random).toEqual(initial.random);
    const encoded = encodeRun(pending);
    const loaded = await readRunWithRecovery({
      readCandidates: async () => [encoded],
      write: async () => {},
    });
    expect(loaded?.snapshot).toEqual(pending);
    game = restoreSession(loaded!.snapshot, runHandler);
    expect(game.dispatch({ type: "exchange", id: "missing" }).snapshot).toEqual(pending);
    expect(game.dispatch({ type: "route", choice: "combat" }).snapshot).toEqual(pending);
    expect(game.dispatch({ type: "exchange", id: null }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state).toEqual(initial.state);
    expect(game.getSnapshot().random).toEqual(initial.random);
    expect(game.dispatch({ type: "route", choice: "event" }).decision.accepted).toBe(true);
    expect(game.dispatch({ type: "exchange", id: outgoing.id }).decision.accepted).toBe(true);
    const result = game.getSnapshot();
    expect(result.state.phase).toBe("battle");
    expect(result.state.fight).toBe(1);
    expect(result.state.player.hp).toBe(4);
    expect(result.state.deck).toHaveLength(initial.state.deck.length);
    expect(result.state.deck.some((card) => card.id === outgoing.id)).toBe(false);
    expect(result.state.deck.filter((card) => card.pair === incoming)).toHaveLength(1);
    expect(result.state.deck.slice(1)).toEqual(initial.state.deck.slice(1));
    expect([...result.state.zones.hand, ...result.state.zones.library].map((card) => card.id).sort()).toEqual(
      result.state.deck.map((card) => card.id).sort(),
    );
    const resumed = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(result)],
      write: async () => {},
    });
    expect(resumed?.snapshot).toEqual(result);
  });
  it("rejects malformed exchange saves and never offers an exchange for an empty deck", async () => {
    const initial = structuredClone(routeGame().getSnapshot());
    initial.state.experiment!.route!.event = "blood";
    initial.state.experiment!.route!.selecting = true;
    await expect(
      readRunWithRecovery({ readCandidates: async () => [encodeRun(initial)], write: async () => {} }),
    ).rejects.toThrow();
    for (let seed = 0; seed < 20; seed++) {
      const empty = structuredClone(createRun(seed, options).getSnapshot());
      empty.state.phase = "reward";
      empty.state.offers = [];
      empty.state.deck = [];
      const game = restoreSession(empty, runHandler);
      expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.experiment!.route?.event).not.toBe("exchange");
    }
  });
  it("allows risky non-blood events at low health but rejects the blood bargain", () => {
    for (const event of ["blood", "thorns", "lantern"] as const) {
      const initial = structuredClone(routeGame().getSnapshot());
      initial.state.player.hp = 4;
      initial.state.experiment!.route!.event = event;
      const game = restoreSession(initial, runHandler);
      const result = game.dispatch({ type: "route", choice: "event" });
      expect(result.decision.accepted).toBe(event !== "blood");
      if (event === "blood") expect(result.snapshot).toEqual(initial);
      else expect(result.snapshot.state.player.hp).toBe(4);
    }
  });
  it("keeps the first expedition and classic opening while varying later expeditions without repeats", () => {
    const tier2 = new Set<string>();
    const tier3 = new Set<string>();
    for (let seed = 0; seed < 180; seed++) {
      expect(createRun(seed).getSnapshot().state.encounters![0]).toBe("fixture:0");
      expect(createRun(seed, options).getSnapshot().state.encounters![0]).toBe("fixture:0");
      for (const [tier, observed] of [
        [2, tier2],
        [3, tier3],
      ] as const) {
        const first = createRun(seed, { ...options, tier }).getSnapshot();
        const repeated = createRun(seed, { ...options, tier }).getSnapshot();
        expect(first).toEqual(repeated);
        const encounters = first.state.encounters!;
        expect(new Set(encounters).size).toBe(encounters.length);
        expect(first.state.enemy.hp).toBe(getEnemy(first.state).hp);
        observed.add(encounters[0]!);
      }
    }
    expect(tier2).toEqual(new Set(["fixture:0", "the-ink-jackrabbit", "the-blue-jackal"]));
    expect(tier3).toEqual(
      new Set(["fixture:0", "the-ink-jackrabbit", "the-blue-jackal", "the-brass-cicada"]),
    );
  });
  it.each([
    { id: "the-ink-jackrabbit", hp: 22, damage: 4 },
    { id: "the-blue-jackal", hp: 24, damage: 5 },
    { id: "the-brass-cicada", hp: 24, damage: 3 },
  ])("resolves the first turn of the $id opening", ({ id, hp, damage }) => {
    const seed = Array.from({ length: 180 }, (_, i) => i).find(
      (value) => createRun(value, { ...options, tier: 3 }).getSnapshot().state.encounters![0] === id,
    )!;
    expect(seed).toBeDefined();
    const game = createRun(seed, { ...options, tier: 3 });
    expect(game.getSnapshot().state.enemy.hp).toBe(hp);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(30 - damage);
    expect(game.getSnapshot().state.action).toBe(1);
  });
  it("resumes both varied and older Moth openings without changing the current run", async () => {
    const variedSeed = Array.from({ length: 100 }, (_, i) => i).find(
      (seed) => createRun(seed, { ...options, tier: 2 }).getSnapshot().state.encounters![0] !== "fixture:0",
    )!;
    const older = structuredClone(createRun(7, options).getSnapshot());
    older.state.experiment!.tier = 3;
    for (const snapshot of [older, createRun(variedSeed, { ...options, tier: 2 }).getSnapshot()]) {
      const saved = encodeRun(snapshot);
      const restored = await readRunWithRecovery({
        readCandidates: async () => [saved],
        write: async () => {},
      });
      expect(restored?.snapshot).toEqual(snapshot);
      const game = restoreSession(restored!.snapshot, runHandler);
      expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
      const again = await readRunWithRecovery({
        readCandidates: async () => [encodeRun(game.getSnapshot())],
        write: async () => {},
      });
      expect(again?.snapshot).toEqual(game.getSnapshot());
      expect(again!.snapshot.state.encounters![0]).toBe(snapshot.state.encounters![0]);
    }
  });
  it("expands future encounter pools across tiers", () => {
    const pools = [1, 2, 3].map((tier) => {
      const ids = new Set<string>();
      for (let seed = 0; seed < 180; seed++) {
        const state = createRun(seed, { ...options, tier }).getSnapshot().state;
        state.encounters!.forEach((id) => ids.add(id));
      }
      return ids.size;
    });
    expect(pools[1]!).toBeGreaterThan(pools[0]!);
    expect(pools[2]!).toBeGreaterThan(pools[1]!);
  });
  it("resolves a combat detour and its reward before rejoining", async () => {
    let game = routeGame("many-eyes");
    const expected = game.getSnapshot().state.experiment!.route!.enemy;
    expect(game.dispatch({ type: "route", choice: "combat" }).decision.accepted).toBe(true);
    expect(getEnemy(game.getSnapshot().state)).not.toEqual(getEnemy({ fight: 0, encounters: ["fixture:0"] }));
    expect(game.getSnapshot().state.experiment!.route).toMatchObject({ enemy: expected, active: true });
    const snapshot = structuredClone(game.getSnapshot());
    const source = [...snapshot.state.zones.hand, ...snapshot.state.zones.library].find(
      (card) => card.pair === "Sun & Moon",
    )!;
    snapshot.state.zones.library = snapshot.state.zones.library.filter((card) => card.id !== source.id);
    if (!snapshot.state.zones.hand.some((card) => card.id === source.id))
      snapshot.state.zones.hand.push(source);
    snapshot.state.enemy.hp = 1;
    game = restoreSession(snapshot, runHandler);
    expect(game.dispatch({ type: "play", id: source.id }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.phase).toBe("reward");
    expect(game.getSnapshot().state.offers).toHaveLength(4);
    const saved = encodeRun(game.getSnapshot());
    expect(
      (await readRunWithRecovery({ readCandidates: async () => [saved], write: async () => {} }))?.snapshot,
    ).toEqual(game.getSnapshot());
    game.dispatch({ type: "reward", pair: null });
    expect(game.getSnapshot().state.fight).toBe(1);
    expect(game.getSnapshot().state.phase).toBe("battle");
    expect(game.getSnapshot().state.experiment!.route).toBeUndefined();
  });
  for (const fight of [0, 2] as const)
    for (const ending of ["concede", "burn"] as const) {
      it(`retains a ${ending} defeat in the detour after fight ${fight + 1}`, async () => {
        const route = structuredClone(routeGame().getSnapshot());
        route.state.fight = fight;
        let game = restoreSession(route, runHandler);
        expect(game.dispatch({ type: "route", choice: "combat" }).decision.accepted).toBe(true);
        if (ending === "burn") {
          const doomed = structuredClone(game.getSnapshot());
          doomed.state.player.hp = 1;
          doomed.state.player.burn = 2;
          game = restoreSession(doomed, runHandler);
        }
        const result = game.dispatch(ending === "concede" ? { type: "concede" } : { type: "end" });
        expect(result.decision.accepted).toBe(true);
        expect(result.snapshot.state.phase).toBe("defeat");
        expect(result.snapshot.state.experiment?.route?.active).toBe(true);
        const saved = encodeRun(result.snapshot);
        const loaded = await readRunWithRecovery({
          readCandidates: async () => [saved],
          write: async () => {},
        });
        expect(loaded?.snapshot).toEqual(result.snapshot);
        expect(loaded?.recovered).toBe(false);
      });
    }
  it("honors orientation, Cracked Vessel, and the extra midpoint removal", () => {
    const dark = createRun(21, { ...options, orientation: "dark", relic: "cracked-vessel" }).getSnapshot()
      .state;
    expect(dark.player.hp).toBe(24);
    expect(dark.player.maxHp).toBe(30);
    expect(dark.deck).toHaveLength(11);
    expect([...dark.zones.hand, ...dark.zones.library].every((card) => card.face === "dark")).toBe(true);
    const snapshot = structuredClone(createRun(22, { ...options, relic: "spare-thread" }).getSnapshot());
    snapshot.state.phase = "rest";
    snapshot.state.fight = 1;
    const game = restoreSession(snapshot, runHandler);
    game.dispatch({ type: "rest", remove: snapshot.state.deck[0]!.id });
    expect(game.getSnapshot().state.phase).toBe("rest");
    game.dispatch({ type: "rest", remove: snapshot.state.deck[1]!.id });
    expect(game.getSnapshot().state.deck).toHaveLength(8);
    expect(game.getSnapshot().state.fight).toBe(2);
  });
  it("awards each expedition once and expands only future pool tiers", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
      clear: () => {
        data.clear();
      },
      key: (index: number) => [...data.keys()][index] ?? null,
      get length() {
        return data.size;
      },
    } as Storage;
    expect(unlockTier(readProgression(storage))).toBe(1);
    recordExpedition(storage, "one");
    expect(unlockTier(recordExpedition(storage, "one"))).toBe(2);
    expect(unlockTier(recordExpedition(storage, "two"))).toBe(3);
    expect(createRun(4, options).getSnapshot().state.experiment!.tier).toBe(1);
  });
  it("does not report an unlock when progression storage fails", () => {
    const storage = {
      getItem: () => JSON.stringify({ completed: ["first"] }),
      setItem: () => {
        throw new Error("storage full");
      },
    } as unknown as Storage;
    expect(recordExpedition(storage, "second")).toEqual({ completed: ["first"] });
    expect(unlockTier(recordExpedition(storage, "second"))).toBe(2);
    expect(recordExpedition(null, "first")).toEqual({ completed: [] });
  });
});
