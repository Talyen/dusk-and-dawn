import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

it("Feather draws options while Chain protects against the Cicada's rattling wings", () => {
  for (const face of ["light", "dark"] as const) {
    const setup = structuredClone(createRun(19, undefined, "oathless-seraph").getSnapshot());
    setup.state.encounters![0] = "the-brass-cicada";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 24;
    setup.state.action = 1;
    setup.state.zones.hand = [{ id: "feather", pair: "Feather & Chain", face, kept: false }];
    setup.state.zones.library = [
      { id: "sun", pair: "Sun & Moon", face: "light", kept: false },
      { id: "angel", pair: "Angel & Vampire", face: "light", kept: false },
    ];
    setup.state.zones.discard = [];
    setup.state.zones.banished = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "feather" }).decision.accepted).toBe(true);
    const beforeAttack = game.getSnapshot().state;
    expect(beforeAttack.zones.hand.map((card) => card.id)).toEqual(face === "light" ? ["angel", "sun"] : []);
    expect(beforeAttack.player.ward).toBe(face === "light" ? 1 : 0);
    expect(beforeAttack.enemy.curse).toBe(face === "dark" ? 2 : 0);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(face === "light" ? 25 : 29);
    expect(game.getSnapshot().state.enemy.curse).toBe(0);
  }
});

it("the Witch's Censer defends now while Plague Brazier damages the Jackal over time", () => {
  for (const face of ["light", "dark"] as const) {
    const setup = structuredClone(createRun(19, undefined, "thorn-witch").getSnapshot());
    setup.state.encounters![0] = "the-blue-jackal";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 24;
    setup.state.action = 0;
    setup.state.zones.hand = [{ id: "censer", pair: "Censer & Plague Brazier", face, kept: false }];
    setup.state.zones.library = [];
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "censer" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy).toMatchObject({
      curse: face === "light" ? 2 : 0,
      poison: face === "dark" ? 3 : 0,
    });
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const after = game.getSnapshot().state;
    expect(after.player.hp).toBe(face === "light" ? 27 : 25);
    expect(after.enemy).toMatchObject({
      hp: face === "light" ? 24 : 21,
      curse: 0,
      poison: face === "dark" ? 1 : 0,
    });
  }
});

it("Benediction empowers the Seraph against the Hollow King and is consumed", () => {
  const setup = structuredClone(createRun(19, undefined, "oathless-seraph").getSnapshot());
  setup.state.encounters![0] = "hollow-king";
  setup.state.enemy.hp = setup.state.enemy.maxHp = 48;
  setup.state.action = 0;
  setup.state.zones.hand = [
    { id: "bless", pair: "Benediction & Curse", face: "light", kept: false },
    { id: "seraph", pair: "Seraph & Fallen Seraph", face: "light", kept: false },
  ];
  setup.state.zones.library = [];
  setup.state.zones.discard = [];
  setup.state.zones.banished = [];
  const game = restoreSession(setup, runHandler);
  expect(game.dispatch({ type: "play", id: "bless" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player).toMatchObject({ bless: 3, ward: 1 });
  expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toContain("bless");
  expect(game.dispatch({ type: "play", id: "seraph" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.hp).toBe(36); // 7 Radiance + 3 Bless + 2 weakness.
  expect(game.getSnapshot().state.player.bless).toBe(0);
  expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player.hp).toBe(25); // Ward absorbs one of Royal Reach's six.
});
