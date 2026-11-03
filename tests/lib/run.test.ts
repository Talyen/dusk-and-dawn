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
  it("leaves required-target costs unspent when no eligible target is chosen", () => {
    const setup = structuredClone(createRun(1).getSnapshot());
    setup.state.zones.hand = [{ id: "ash", pair: "Seed & Ash", face: "dark", kept: false }];
    const game = restoreSession(setup, runHandler);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "ash" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
  });
});
