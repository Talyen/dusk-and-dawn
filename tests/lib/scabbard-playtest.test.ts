import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

function setup(mana: number) {
  const snapshot = structuredClone(createRun(19).getSnapshot());
  snapshot.state.encounters![0] = "radiant-moth";
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = 18;
  snapshot.state.action = 0;
  snapshot.state.mana = mana;
  snapshot.state.zones.hand = [{ id: "blade", pair: "Scabbard & Drawn Blade", face: "light", kept: false }];
  snapshot.state.zones.library = [{ id: "next", pair: "Sun & Moon", face: "light", kept: false }];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("drawing and striking with the blade costs two mana and discards the same card", () => {
  const game = restoreSession(setup(3), runHandler);
  expect(game.dispatch({ type: "play", id: "blade" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.zones.hand).toEqual([
    { id: "blade", pair: "Scabbard & Drawn Blade", face: "dark", kept: true },
  ]);
  expect(game.getSnapshot().state.mana).toBe(2);
  expect(game.dispatch({ type: "play", id: "blade" }).decision.accepted).toBe(true);
  const result = game.getSnapshot().state;
  expect(result.mana).toBe(1);
  expect(result.enemy.hp).toBe(12);
  expect(result.zones.hand).toEqual([]);
  expect(result.zones.discard).toEqual([
    { id: "blade", pair: "Scabbard & Drawn Blade", face: "dark", kept: false },
  ]);
});

it("drawing with the last mana keeps the blade available after the enemy turn and reload", () => {
  const first = restoreSession(setup(1), runHandler);
  expect(first.dispatch({ type: "play", id: "blade" }).decision.accepted).toBe(true);
  expect(first.getSnapshot().state.mana).toBe(0);
  const resumed = restoreSession(structuredClone(first.getSnapshot()), runHandler);
  expect(resumed.dispatch({ type: "end" }).decision.accepted).toBe(true);
  expect(resumed.getSnapshot().state.player.hp).toBe(26);
  expect(resumed.getSnapshot().state.zones.hand[0]).toEqual({
    id: "blade",
    pair: "Scabbard & Drawn Blade",
    face: "dark",
    kept: false,
  });
  expect(resumed.dispatch({ type: "play", id: "blade" }).decision.accepted).toBe(true);
  expect(resumed.getSnapshot().state.enemy.hp).toBe(12);
});
