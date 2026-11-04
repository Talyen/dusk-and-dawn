import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

function scenario(face: "light" | "dark") {
  const snapshot = structuredClone(createRun(19).getSnapshot());
  snapshot.state.encounters![0] = "the-velvet-mole";
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = 24;
  snapshot.state.action = 1;
  snapshot.state.zones.hand = [
    { id: "anchor", pair: "Anchor & Kite", face, kept: false },
    { id: "sun", pair: "Sun & Moon", face: "light", kept: false },
    { id: "angel", pair: "Angel & Vampire", face: "light", kept: false },
  ];
  snapshot.state.zones.library = [
    { id: "bottom", pair: "Bloom & Wither", face: "light", kept: false },
    { id: "top", pair: "Key & Lock", face: "dark", kept: false },
  ];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("Anchor holds the other hand for next turn while Kite draws two now", () => {
  const anchor = restoreSession(scenario("light"), runHandler);
  expect(anchor.dispatch({ type: "play", id: "anchor" }).decision.accepted).toBe(true);
  expect(anchor.getSnapshot().state.zones.hand.map((card) => [card.id, card.kept])).toEqual([
    ["sun", true],
    ["angel", true],
  ]);
  expect(anchor.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["anchor"]);
  expect(anchor.dispatch({ type: "end" }).decision.accepted).toBe(true);
  expect(
    anchor
      .getSnapshot()
      .state.zones.hand.map((card) => card.id)
      .slice(0, 2),
  ).toEqual(["sun", "angel"]);

  const kite = restoreSession(scenario("dark"), runHandler);
  expect(kite.dispatch({ type: "play", id: "anchor" }).decision.accepted).toBe(true);
  expect(kite.getSnapshot().state.zones.hand.map((card) => [card.id, card.kept])).toEqual([
    ["sun", false],
    ["angel", false],
    ["top", false],
    ["bottom", false],
  ]);
  expect(kite.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["anchor"]);
});

it("Secrecy silences a tunnel once, but cannot be spent on a plain attack", () => {
  for (const action of [0, 1]) {
    const snapshot = scenario("light");
    snapshot.state.action = action;
    snapshot.state.player.ward = 5;
    snapshot.state.zones.hand = [{ id: "secret", pair: "Confession & Secrecy", face: "dark", kept: false }];
    const game = restoreSession(snapshot, runHandler);
    expect(game.dispatch({ type: "play", id: "secret" }).decision.accepted).toBe(action === 1);
    const played = game.getSnapshot().state;
    expect(played.mana).toBe(action === 1 ? 2 : 3);
    expect(played.zones.banished.map((card) => card.id)).toEqual(action === 1 ? ["secret"] : []);
    if (action === 1) {
      expect(played.enemy.hush).toBe(true);
      expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.player.hp).toBe(30);
      expect(game.getSnapshot().state.enemy.hush).toBe(false);
    }
  }
});
