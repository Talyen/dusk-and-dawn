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

it("Prism attacks while Black Glass reflects only the first of the Sphinx's two hits", () => {
  for (const face of ["light", "dark"] as const) {
    const setup = encounter("the-mirrored-sphinx", 36, 1);
    setup.state.zones.hand = [{ id: "glass", pair: "Prism & Black Glass", face, kept: false }];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "glass" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy.hp).toBe(face === "light" ? 30 : 36);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(
      face === "dark" ? ["glass"] : [],
    );
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(face === "light" ? 24 : 27);
    expect(result.enemy.hp).toBe(face === "light" ? 30 : 33);
    expect(result.player.reflect).toBe(false);
  }
});

it("Gravity before Levitation returns the attack just spent; reversing them returns the earlier discard", () => {
  for (const gravityFirst of [true, false]) {
    const setup = encounter("the-mirrored-sphinx", 36, 0);
    setup.state.zones.hand = [
      { id: "gravity", pair: "Gravity & Levitation", face: "light", kept: false },
      { id: "levitation", pair: "Gravity & Levitation", face: "dark", kept: false },
    ];
    setup.state.zones.discard = [{ id: "older", pair: "Sun & Moon", face: "light", kept: false }];
    const game = restoreSession(setup, runHandler);
    for (const id of gravityFirst ? ["gravity", "levitation"] : ["levitation", "gravity"])
      expect(game.dispatch({ type: "play", id }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.enemy.hp).toBe(29);
    expect(result.zones.hand.map((card) => card.id)).toEqual([gravityFirst ? "gravity" : "older"]);
    expect(result.zones.discard.map((card) => card.id)).toEqual(
      gravityFirst ? ["older", "levitation"] : ["levitation", "gravity"],
    );
  }
});

it("the Carousel sends the next library card around again unless Hushed", () => {
  for (const hush of [false, true]) {
    const setup = encounter("the-bleak-carousel", 24, 1);
    setup.state.enemy.hush = hush;
    setup.state.zones.hand = Array.from({ length: 8 }, (_, index) => ({
      id: `held-${index}`,
      pair: "Sun & Moon",
      face: "light" as const,
      kept: true,
    }));
    setup.state.zones.library = [
      { id: "bottom", pair: "Sun & Moon", face: "light", kept: false },
      { id: "middle", pair: "Angel & Vampire", face: "light", kept: false },
      { id: "top", pair: "Bloom & Wither", face: "dark", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const result = game.getSnapshot().state;
    expect(result.player.hp).toBe(26);
    expect(result.zones.library.map((card) => card.id)).toEqual(
      hush ? ["bottom", "middle", "top"] : ["top", "bottom", "middle"],
    );
    expect(result.zones.library.find((card) => card.id === "top")?.face).toBe("dark");
  }
});
