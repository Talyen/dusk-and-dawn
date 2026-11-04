import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

function encounter(enemy: string, hp: number, action: number) {
  const snapshot = structuredClone(createRun(19).getSnapshot());
  snapshot.state.encounters![0] = enemy;
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = hp;
  snapshot.state.action = action;
  snapshot.state.deck = [];
  snapshot.state.zones.hand = [];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("Candle feeds the Lantern Eater after Burn ticks unless Silence Hushes the trait", () => {
  for (const hush of [false, true]) {
    const setup = encounter("lantern-eater", 32, 1);
    setup.state.zones.hand = [
      { id: "candle", pair: "Candle & Extinguished Candle", face: "light", kept: false },
      { id: "silence", pair: "Silence & Clamor", face: "light", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "candle" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.mana).toBe(3); // Candle refunds its own cost.
    expect(game.getSnapshot().state.enemy.burn).toBe(2);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toContain("candle");
    if (hush) expect(game.dispatch({ type: "play", id: "silence" }).decision.accepted).toBe(true);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(26);
    expect(result.enemy.hp).toBe(hush ? 30 : 32);
    expect(result.enemy.burn).toBe(hush ? 1 : 0);
  }
});

it("Mirror and Shattered Mirror interact with the Swan's one-hit reflection independently", () => {
  const setup = encounter("the-mirror-eyed-swan", 26, 1);
  setup.state.enemy.reflect = true;
  setup.state.zones.hand = [
    { id: "mirror", pair: "Mirror & Shattered Mirror", face: "light", kept: false },
    { id: "shards", pair: "Mirror & Shattered Mirror", face: "dark", kept: false },
  ];
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "mirror" }).decision.accepted).toBe(true);
  expect(game.dispatch({ type: "play", id: "shards" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player).toMatchObject({ hp: 28, reflect: true });
  expect(game.getSnapshot().state.enemy).toMatchObject({ hp: 24, reflect: false });
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player).toMatchObject({ hp: 28, reflect: false });
  expect(game.getSnapshot().state.enemy.hp).toBe(20);
});

it("against the Painted Raven, the last hit of the last played attack controls its next attack", () => {
  for (const [order, copied] of [
    [["sun", "shards"], 3],
    [["shards", "sun"], 6],
  ] as const) {
    const setup = encounter("the-painted-raven", 26, 1);
    setup.state.zones.hand = [
      { id: "sun", pair: "Sun & Moon", face: "light", kept: false },
      { id: "shards", pair: "Mirror & Shattered Mirror", face: "dark", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    for (const id of order) expect(game.dispatch({ type: "play", id }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy.hp).toBe(16);
    expect(game.getSnapshot().state.latestDirectHit).toBe(copied === 3 ? 2 : 6);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(30 - copied);
    expect(game.getSnapshot().state.latestDirectHit).toBeUndefined();
  }
});
