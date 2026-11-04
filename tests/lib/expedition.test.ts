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
  return game;
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
