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
    expect(Object.keys(simpleCards).length).toBeGreaterThan(100);
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
});
