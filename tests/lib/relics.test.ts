import { describe, expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun, readRun, resumeRun } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";
import type { HeroId } from "../../src/lib/game/heroes";
import type { RelicId } from "../../src/lib/game/relics";

function setup(relic: RelicId, hero: HeroId, pairs: string[], faces: ("light" | "dark")[]) {
  const snapshot = structuredClone(
    createRun(11, { id: "relic-test", tier: 1, orientation: "light", relic }, hero).getSnapshot(),
  );
  snapshot.state.deck = pairs.map((pair, index) => ({ id: `card-${index}`, pair }));
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

async function reload(snapshot: ReturnType<ReturnType<typeof createRun>["getSnapshot"]>) {
  const saved = await readRun({ readCandidates: async () => [encodeRun(snapshot)], write: async () => {} });
  expect(saved).toEqual(snapshot);
  return resumeRun(saved!);
}

describe("run-only relics", () => {
  it("keeps the new Cracked Vessel health cap through healing, fights and saves", async () => {
    const initial = setup("cracked-vessel", "thorn-witch", ["Bloom & Wither"], ["light"]);
    expect(initial.state.player).toMatchObject({ hp: 24, maxHp: 24 });
    initial.state.player.hp = 23;
    let game = await reload(initial);
    expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player).toMatchObject({ hp: 24, maxHp: 24 });
    const reward = structuredClone(game.getSnapshot());
    reward.state.phase = "reward";
    reward.state.offers = [];
    reward.state.player.hp = 22;
    game = await reload(reward);
    game.dispatch({ type: "reward", pair: null });
    game.dispatch({ type: "route", choice: "rest" });
    expect(game.getSnapshot().state.player).toMatchObject({ hp: 24, maxHp: 24 });
    expect((await reload(game.getSnapshot())).getSnapshot()).toEqual(game.getSnapshot());
  });

  it("preserves the original 30 HP cap for a saved Cracked Vessel run", async () => {
    const old = setup("cracked-vessel", "thorn-witch", ["Bloom & Wither"], ["light"]);
    old.state.player.hp = 24;
    old.state.player.maxHp = 30;
    old.state.phase = "reward";
    old.state.offers = [];
    let game = await reload(old);
    game.dispatch({ type: "reward", pair: null });
    game.dispatch({ type: "route", choice: "rest" });
    expect(game.getSnapshot().state.player).toMatchObject({ hp: 28, maxHp: 30 });
    game = await reload(game.getSnapshot());
    expect(game.getSnapshot().state.player.maxHp).toBe(30);
  });

  it.each([
    ["oathless-seraph", "light", 3, 0],
    ["thorn-witch", "dark", 2, 1],
    ["veiled-oracle", "light", 2, 0],
  ] as const)(
    "combines Ashen Seal with %s without changing the hero passive",
    async (hero, face, ward, curse) => {
      const initial = setup("ashen-seal", hero, ["Bloom & Wither"], [face]);
      initial.state.player.hp = 20;
      let game = await reload(initial);
      expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(true);
      expect(game.getSnapshot().state.player.ward).toBe(ward);
      expect(game.getSnapshot().state.enemy.curse).toBe(curse);
      expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-0"]);
      game = await reload(game.getSnapshot());
      const before = game.getSnapshot();
      expect(game.dispatch({ type: "play", id: "card-0" }).decision.accepted).toBe(false);
      expect(game.getSnapshot()).toEqual(before);
    },
  );

  it("does not grant Ashen Seal Ward when a different card is Banished", () => {
    const initial = setup(
      "ashen-seal",
      "veiled-oracle",
      ["Sacrifice & Self-Preservation", "Sun & Moon"],
      ["light", "light"],
    );
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "play", id: "card-0", targets: ["card-1"] }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["card-1"]);
    expect(game.getSnapshot().state.player.ward).toBe(0);
  });

  it("grants Ashen Seal Ward after the card's reflected damage, only if the player survives", () => {
    const initial = setup("ashen-seal", "veiled-oracle", ["Bloom & Wither"], ["dark"]);
    initial.state.enemy.reflect = true;
    const game = restoreSession(initial, runHandler);
    game.dispatch({ type: "play", id: "card-0" });
    expect(game.getSnapshot().state.player.hp).toBe(23);
    expect(game.getSnapshot().state.player.ward).toBe(2);
    initial.state.player.hp = 3;
    const doomed = restoreSession(initial, runHandler);
    doomed.dispatch({ type: "play", id: "card-0" });
    expect(doomed.getSnapshot().state.phase).toBe("defeat");
    expect(doomed.getSnapshot().state.player.ward).toBe(0);
  });

  it("heals Hollow Chalice only for skipping an actual offer, capped at max HP", async () => {
    const initial = setup("hollow-chalice", "veiled-oracle", ["Angel & Vampire"], ["light"]);
    initial.state.phase = "reward";
    initial.state.offers = ["Sun & Moon"];
    initial.state.player.hp = 29;
    let game = await reload(initial);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "reward", pair: "Flame & Frost" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(30);
    expect(game.getSnapshot().state.deck).toHaveLength(1);
    game = await reload(game.getSnapshot());
    expect(game.getSnapshot().state.player.hp).toBe(30);

    initial.state.player.hp = 20;
    const picked = restoreSession(initial, runHandler);
    picked.dispatch({ type: "reward", pair: "Sun & Moon" });
    expect(picked.getSnapshot().state.player.hp).toBe(20);
    expect(picked.getSnapshot().state.deck).toHaveLength(2);
    initial.state.offers = [];
    const empty = restoreSession(initial, runHandler);
    empty.dispatch({ type: "reward", pair: null });
    expect(empty.getSnapshot().state.player.hp).toBe(20);
  });
});
