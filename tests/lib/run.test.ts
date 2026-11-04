import { describe, expect, it } from "vitest";
import { createRun, face, route, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

describe("playable run", () => {
  it("starts deterministically and rejects invalid plays without consuming state or random draws", () => {
    const a = createRun(42),
      b = createRun(42);
    expect(a.getSnapshot()).toEqual(b.getSnapshot());
    const before = a.getSnapshot();
    expect(a.dispatch({ type: "play", id: "missing" }).decision.accepted).toBe(false);
    expect(a.getSnapshot()).toEqual(before);
    expect(before.state.zones.hand).toHaveLength(5);
    expect(before.state.mana).toBe(3);
  });
  it("plays an Angel and applies the first enemy intent at end turn", () => {
    const source = createRun(5).getSnapshot();
    const setup = structuredClone(source);
    const angel = [...setup.state.zones.hand, ...setup.state.zones.library].find(
      (c) => face(c).name === "Angel",
    )!;
    setup.state.zones.hand = [angel];
    setup.state.zones.library = [];
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: angel.id }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.ward).toBe(5);
    game.dispatch({ type: "end" });
    const s = game.getSnapshot().state;
    expect([s.player.hp, s.player.ward, s.action, s.mana]).toEqual([30, 0, 1, 3]);
  });
  it.each([
    { enemy: "the-blue-jackal", hp: 24, ward: 0, healed: 3, remaining: 21, wardRemaining: 0 },
    { enemy: "fixture:0", hp: 18, ward: 0, healed: 5, remaining: 13, wardRemaining: 0 },
    { enemy: "fixture:0", hp: 18, ward: 10, healed: 5, remaining: 18, wardRemaining: 5 },
    { enemy: "fixture:0", hp: 1, ward: 0, healed: 5, remaining: 0, wardRemaining: 0 },
  ])("Vampire deals and Leeches its revised damage with $enemy at $hp HP and $ward Ward", (scenario) => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.encounters![0] = scenario.enemy;
    setup.state.enemy.hp = scenario.hp;
    setup.state.enemy.maxHp = scenario.hp;
    setup.state.enemy.ward = scenario.ward;
    setup.state.player.hp = 20;
    setup.state.zones.hand = [{ id: "vampire", pair: "Angel & Vampire", face: "dark", kept: false }];
    const game = restoreSession(setup, runHandler);
    expect(face(setup.state.zones.hand[0]!).effect).toBe("Deal 3 Shadow damage. Leech.");
    expect(game.dispatch({ type: "play", id: "vampire" }).decision.accepted).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player.hp).toBe(20 + scenario.healed);
    expect(state.enemy.hp).toBe(scenario.remaining);
    expect(state.enemy.ward).toBe(scenario.wardRemaining);
    expect(state.zones.discard.map((card) => card.id)).toContain("vampire");
  });
  it("progresses through all five fights, rewards, midpoint rest, and victory", () => {
    const game = createRun(17);
    let snapshot = game.getSnapshot();
    for (let fight = 0; fight < route.length; fight++) {
      const setup = structuredClone(snapshot);
      setup.state.enemy.hp = 1;
      setup.state.player.hp = 30;
      setup.state.mana = 3;
      const sun = setup.state.deck.find((c) => c.pair === "Sun & Moon")!;
      setup.state.zones.hand = [{ ...sun, face: "light", kept: false }];
      setup.state.zones.library = [];
      setup.state.zones.discard = [];
      setup.state.zones.banished = [];
      const combat = restoreSession(setup, runHandler);
      expect(combat.dispatch({ type: "play", id: sun.id }).decision.accepted).toBe(true);
      if (fight === 4) {
        expect(combat.getSnapshot().state.phase).toBe("victory");
        break;
      }
      expect(combat.getSnapshot().state.phase).toBe("reward");
      expect(combat.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
      if (fight === 1) {
        expect(combat.getSnapshot().state.phase).toBe("rest");
        combat.dispatch({ type: "rest" });
      }
      snapshot = combat.getSnapshot();
      expect(snapshot.state.fight).toBe(fight + 1);
    }
  });
  it("resolves the revised automatic card flow and preserves pile order", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    const card = (id: string, pair: string, face: "light" | "dark" = "light") => ({
      id,
      pair,
      face,
      kept: false,
    });
    setup.state.zones.hand = [card("seed", "Seed & Ash")];
    setup.state.zones.discard = [
      card("bottom", "Sun & Moon"),
      card("middle", "Angel & Vampire"),
      card("top", "Flame & Frost"),
    ];
    setup.state.zones.library = [card("library", "Key & Lock")];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "seed" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.library.map((c) => c.id)).toEqual(["bottom", "middle", "library"]);
    expect(game.getSnapshot().state.zones.discard.map((c) => c.id)).toEqual(["top", "seed"]);
  });
  it.each(["Ash", "Oblivion"])("plays %s without selecting another card and banishes its source", (name) => {
    const setup = structuredClone(createRun(1).getSnapshot());
    const pair = name === "Ash" ? "Seed & Ash" : "Memory & Oblivion";
    setup.state.zones.hand = [{ id: "source", pair, face: "dark", kept: false }];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.banished.map((c) => c.id)).toContain("source");
  });
  it("requires a real Memory choice when discard contains cards and banishes Memory", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.zones.hand = [{ id: "memory", pair: "Memory & Oblivion", face: "light", kept: false }];
    setup.state.zones.discard = [
      { id: "other", pair: "Angel & Vampire", face: "light", kept: false },
      { id: "target", pair: "Sun & Moon", face: "dark", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "memory" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    expect(game.dispatch({ type: "play", id: "memory", targets: ["target"] }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand.map((c) => c.id)).toEqual(["target"]);
    expect(game.getSnapshot().state.zones.banished.map((c) => c.id)).toContain("memory");
  });
  it("automatically resolves the only eligible Memory or Sacrifice target", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.zones.hand = [{ id: "memory", pair: "Memory & Oblivion", face: "light", kept: false }];
    setup.state.zones.discard = [{ id: "target", pair: "Sun & Moon", face: "dark", kept: false }];
    const memory = restoreSession(setup, runHandler);
    expect(memory.dispatch({ type: "play", id: "memory" }).decision.accepted).toBe(true);
    expect(memory.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual(["target"]);

    const offering = structuredClone(setup);
    offering.state.zones.hand = [
      { id: "sacrifice", pair: "Sacrifice & Self-Preservation", face: "light", kept: false },
      { id: "offering", pair: "Sun & Moon", face: "light", kept: false },
    ];
    const sacrifice = restoreSession(offering, runHandler);
    expect(sacrifice.dispatch({ type: "play", id: "sacrifice" }).decision.accepted).toBe(true);
    expect(sacrifice.getSnapshot().state.zones.banished.map((card) => card.id)).toContain("offering");
  });
  it("Hush suppresses the trait but preserves the base attack, then expires", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.action = 1;
    setup.state.enemy.hush = true;
    setup.state.zones.hand = [];
    const game = restoreSession(setup, runHandler);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.player.hp).toBe(26);
    expect(game.getSnapshot().state.enemy.hush).toBe(false);
    expect(game.getSnapshot().state.action).toBe(0);
  });
  it("Hush skips an enemy ability and Freeze clears after skipping an attack", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.fight = 1;
    delete setup.state.encounters;
    setup.state.action = 0;
    setup.state.enemy.hush = true;
    setup.state.zones.hand = [];
    const game = restoreSession(setup, runHandler);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.player.curse).toBe(0);
    expect(game.getSnapshot().state.action).toBe(1);
    const frozen = structuredClone(game.getSnapshot());
    frozen.state.enemy.freeze = true;
    const game2 = restoreSession(frozen, runHandler);
    game2.dispatch({ type: "end" });
    expect(game2.getSnapshot().state.player.hp).toBe(30);
    expect(game2.getSnapshot().state.action).toBe(2);
    expect(game2.getSnapshot().state.enemy.freeze).toBe(false);
  });
  it("applies queued draw and mana penalties once at the next turn", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.player.nextDrawPenalty = 2;
    setup.state.player.nextManaPenalty = 1;
    const game = restoreSession(setup, runHandler);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.zones.hand).toHaveLength(3);
    expect(game.getSnapshot().state.mana).toBe(2);
    expect(game.getSnapshot().state.player.nextDrawPenalty).toBe(0);
    expect(game.getSnapshot().state.player.nextManaPenalty).toBe(0);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.zones.hand).toHaveLength(5);
    expect(game.getSnapshot().state.mana).toBe(3);
  });
  it("plays Silence only against a suppressible intent and banishes it", () => {
    const setup = structuredClone(createRun(8).getSnapshot());
    const silence = { id: "silence", pair: "Silence & Clamor", face: "light" as const, kept: false };
    setup.state.zones.hand = [silence];
    setup.state.action = 0;
    const game = restoreSession(setup, runHandler);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: silence.id }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    const eligible = structuredClone(before);
    eligible.state.action = 1;
    const game2 = restoreSession(eligible, runHandler);
    expect(game2.dispatch({ type: "play", id: silence.id }).decision.accepted).toBe(true);
    expect(game2.getSnapshot().state.enemy.hush).toBe(true);
    expect(game2.getSnapshot().state.zones.banished.map((c) => c.id)).toContain("silence");
    game2.dispatch({ type: "end" });
    expect(game2.getSnapshot().state.player.hp).toBe(26);
  });
  it("plays Ice Crystal, skips the enemy action, and clears Freeze", () => {
    const setup = structuredClone(createRun(9).getSnapshot());
    setup.state.zones.hand = [{ id: "ice", pair: "Ice Crystal & Salt Crystal", face: "light", kept: false }];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "ice" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.banished.map((c) => c.id)).toContain("ice");
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.player.hp).toBe(30);
    expect(game.getSnapshot().state.enemy.freeze).toBe(false);
    expect(game.getSnapshot().state.action).toBe(1);
  });
});
