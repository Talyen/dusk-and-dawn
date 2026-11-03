import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { simpleCards } from "../../src/lib/game/simple-cards.generated";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

describe("supported catalogue cards", () => {
  it("includes complete pairs with exact reviewed wording and prepared artwork", () => {
    const catalogue = JSON.parse(
      readFileSync("docs/Dusk & Dawn — Card Effect Catalogue v0.2.json", "utf8"),
    ) as { pair: string; side: string; face: string; effect: string }[];
    expect(Object.keys(simpleCards).length).toBe(242);
    expect(Object.keys(cards)).toHaveLength(248);
    for (const [pair, faces] of Object.entries(cards))
      for (const side of ["light", "dark"] as const) {
        const source = catalogue.find((entry) => entry.pair === pair && entry.side === side);
        expect(source?.face).toBe(faces[side].name);
        expect(source?.effect).toBe(faces[side].effect);
        expect(existsSync(`public/assets/card-${slug(faces[side].name)}.webp`)).toBe(true);
      }
    for (const [pair, faces] of Object.entries(simpleCards))
      for (const side of ["light", "dark"] as const) {
        const source = catalogue.find((entry) => entry.pair === pair && entry.side === side);
        expect(source?.face).toBe(faces[side].name);
        expect(source?.effect).toBe(faces[side].effect);
        expect(existsSync(`public/assets/card-${slug(faces[side].name)}.webp`)).toBe(true);
      }
  });
  it("executes each supported face without an unhandled card or extra target", () => {
    for (const [pair, faces] of Object.entries(simpleCards))
      for (const side of ["light", "dark"] as const) {
        const setup = structuredClone(createRun(42).getSnapshot());
        setup.state.zones.hand = [
          { id: "source", pair, face: side, kept: false },
          { id: "other", pair: "Sun & Moon", face: "light", kept: false },
        ];
        setup.state.zones.discard = [{ id: "discarded", pair: "Sun & Moon", face: "light", kept: false }];
        setup.state.action = 1;
        setup.state.enemy.hp = 1000;
        setup.state.enemy.maxHp = 1000;
        const game = restoreSession(setup, runHandler);
        const result = game.dispatch({ type: "play", id: "source" });
        expect(result.decision, `${pair}: ${faces[side].name}`).toMatchObject({ accepted: true });
        expect(result.snapshot.state.mana).toBeLessThanOrEqual(3);
      }
  });
  it("Revenant attacks then remains in hand and still costs mana on replay", () => {
    const setup = structuredClone(createRun(42).getSnapshot());
    setup.state.zones.hand = [
      { id: "revenant", pair: "Winged Guardian & Revenant", face: "dark", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    game.dispatch({ type: "play", id: "revenant" });
    expect(game.getSnapshot().state.enemy.hp).toBe(13); // 3 Shadow + 2 weakness
    expect(game.getSnapshot().state.zones.hand.map((card) => card.id)).toContain("revenant");
    expect(game.getSnapshot().state.mana).toBe(2);
    game.dispatch({ type: "play", id: "revenant" });
    expect(game.getSnapshot().state.enemy.hp).toBe(8);
    expect(game.getSnapshot().state.mana).toBe(1);
  });
  it("retains independent physical pairs in the reward catalogue", () => {
    expect(cards["Winged Guardian & Revenant"]?.dark.name).toBe("Revenant");
    expect(cards["Goldfish & Anglerfish"]?.dark.name).toBe("Anglerfish");
  });
  it("rejects unavailable random and HP payments without spending mana or randomness", () => {
    const setup = structuredClone(createRun(7).getSnapshot());
    setup.state.zones.hand = [{ id: "exile", pair: "Pilgrim & Exile", face: "dark", kept: false }];
    const game = restoreSession(setup, runHandler);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "exile" }).decision.accepted).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    const low = structuredClone(before);
    low.state.player.hp = 2;
    low.state.zones.hand = [{ id: "fallen", pair: "Seraph & Fallen Seraph", face: "dark", kept: false }];
    const game2 = restoreSession(low, runHandler);
    expect(game2.dispatch({ type: "play", id: "fallen" }).decision.accepted).toBe(false);
    expect(game2.getSnapshot()).toEqual(low);
  });
  it("uses the fixed bottom discard target and retains its current face", () => {
    const setup = structuredClone(createRun(7).getSnapshot());
    setup.state.zones.hand = [
      { id: "library", pair: "Grand Library & Forgotten Archive", face: "light", kept: false },
    ];
    setup.state.zones.discard = [
      { id: "bottom", pair: "Sun & Moon", face: "dark", kept: false },
      { id: "top", pair: "Angel & Vampire", face: "light", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "library" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toContainEqual({
      id: "bottom",
      pair: "Sun & Moon",
      face: "dark",
      kept: false,
    });
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["top", "library"]);
  });
  it("moves a resolving source to the library before drawing without duplicating it", () => {
    const setup = structuredClone(createRun(7).getSnapshot());
    setup.state.zones.hand = [
      { id: "well", pair: "Grand Staircase & Spiral Well", face: "dark", kept: false },
    ];
    setup.state.zones.library = [];
    setup.state.zones.discard = [];
    setup.state.zones.banished = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "well" }).decision.accepted).toBe(true);
    const zones = game.getSnapshot().state.zones;
    expect(zones.hand.map((card) => card.id)).toEqual(["well"]);
    expect([...zones.library, ...zones.discard, ...zones.banished]).toHaveLength(0);
  });
  it("keeps exactly the card flipped by Marionette", () => {
    const setup = structuredClone(createRun(7).getSnapshot());
    setup.state.zones.hand = [
      { id: "marionette", pair: "Puppeteer & Marionette", face: "dark", kept: false },
      { id: "other", pair: "Sun & Moon", face: "light", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "marionette" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toContainEqual({
      id: "other",
      pair: "Sun & Moon",
      face: "dark",
      kept: true,
    });
  });
  it("moves discard blocks without reversing their top-to-bottom order", () => {
    const setup = structuredClone(createRun(7).getSnapshot());
    setup.state.zones.hand = [{ id: "weaver", pair: "Weaver & Unraveler", face: "light", kept: false }];
    setup.state.zones.library = [{ id: "old", pair: "Sun & Moon", face: "light", kept: false }];
    setup.state.zones.discard = [
      { id: "bottom", pair: "Sun & Moon", face: "light", kept: false },
      { id: "middle", pair: "Sun & Moon", face: "light", kept: false },
      { id: "top", pair: "Sun & Moon", face: "light", kept: false },
    ];
    const game = restoreSession(setup, runHandler);
    game.dispatch({ type: "play", id: "weaver" });
    expect(game.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["old", "middle", "top"]);
  });
});
