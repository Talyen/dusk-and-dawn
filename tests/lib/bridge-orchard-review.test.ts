import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

const card = (id: string, pair: string, face: "light" | "dark" = "light", kept = false) => ({
  id,
  pair,
  face,
  kept,
});
function encounter(enemy: string, hp: number, action: number) {
  const snapshot = structuredClone(createRun(19, undefined, "veiled-oracle").getSnapshot());
  snapshot.state.encounters![0] = enemy;
  snapshot.state.enemy.hp = snapshot.state.enemy.maxHp = hp;
  snapshot.state.action = action;
  snapshot.state.zones.hand = [];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  return snapshot;
}

it("Bridge can recover Chasm after it bypasses Ward, but not before", () => {
  for (const chasmFirst of [true, false]) {
    const setup = encounter("the-chalk-giant", 36, 0);
    setup.state.enemy.ward = 5;
    setup.state.zones.hand = [card("bridge", "Bridge & Chasm"), card("chasm", "Bridge & Chasm", "dark")];
    setup.state.zones.discard = [card("older", "Sun & Moon")];
    const game = restoreSession(setup, runHandler);
    for (const id of chasmFirst ? ["chasm", "bridge"] : ["bridge", "chasm"])
      expect(game.dispatch({ type: "play", id }).decision.accepted).toBe(true);
    let result = game.getSnapshot().state;
    expect(result.enemy).toMatchObject({ hp: 31, ward: 5 });
    expect(result.zones.hand.map((item) => item.id)).toEqual([chasmFirst ? "chasm" : "older"]);
    expect(result.mana).toBe(1);
    if (chasmFirst) {
      expect(game.dispatch({ type: "play", id: "chasm" }).decision.accepted).toBe(true);
      result = game.getSnapshot().state;
      expect(result.enemy).toMatchObject({ hp: 26, ward: 5 });
      expect(result.mana).toBe(0);
    }
  }
});

it("Bone Orchard pays with the oldest discard before healing and cannot pay from an empty pile", () => {
  for (const hasDiscard of [true, false]) {
    const setup = encounter("the-chalk-giant", 36, 0);
    setup.state.player.hp = 20;
    setup.state.zones.hand = [card("orchard", "Orchard & Bone Orchard", "dark")];
    setup.state.zones.discard = hasDiscard
      ? [card("oldest", "Sun & Moon"), card("newest", "Key & Lock")]
      : [];
    const game = restoreSession(setup, runHandler);
    const decision = game.dispatch({ type: "play", id: "orchard" }).decision;
    expect(decision.accepted).toBe(hasDiscard);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(hasDiscard ? 23 : 20);
    expect(result.mana).toBe(hasDiscard ? 2 : 3);
    expect(result.zones.banished.map((item) => item.id)).toEqual(hasDiscard ? ["oldest", "orchard"] : []);
    expect(result.zones.discard.map((item) => item.id)).toEqual(hasDiscard ? ["newest"] : []);
    expect(result.zones.hand.map((item) => item.id)).toEqual(hasDiscard ? [] : ["orchard"]);
  }
});

it("the Puppeteer flips a kept card after attacking unless Hushed", () => {
  for (const hush of [false, true]) {
    const setup = encounter("the-ashen-puppeteer", 28, 1);
    setup.state.enemy.hush = hush;
    setup.state.zones.hand = [card("held", "Key & Lock", "dark", true)];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(26);
    expect(result.zones.hand).toEqual([card("held", "Key & Lock", hush ? "dark" : "light")]);
  }
});

it("Broken Hourglass returns held cards to the draw, clears Keep, and banishes itself", () => {
  const setup = encounter("the-chalk-giant", 36, 0);
  setup.state.zones.hand = [
    card("glass", "Hourglass & Broken Hourglass", "dark"),
    card("kept", "Key & Lock", "dark", true),
    card("other", "Sun & Moon"),
  ];
  setup.state.zones.library = [card("library", "Orchard & Bone Orchard", "dark")];
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "glass" }).decision.accepted).toBe(true);
  const zones = game.getSnapshot().state.zones;
  expect(zones.hand.map((item) => item.id).sort()).toEqual(["kept", "library", "other"]);
  expect(zones.hand.find((item) => item.id === "kept")).toEqual(card("kept", "Key & Lock", "dark"));
  expect(zones.library).toEqual([]);
  expect(zones.discard).toEqual([]);
  expect(zones.banished.map((item) => item.id)).toEqual(["glass"]);
});
