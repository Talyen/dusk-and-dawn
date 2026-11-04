import { expect, it } from "vitest";
import { createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

it("Key creates a real damage-versus-safety choice with Ivy and Vampire against the Moth", () => {
  const setup = structuredClone(createRun(19).getSnapshot());
  setup.state.encounters![0] = "radiant-moth";
  setup.state.enemy.hp = setup.state.enemy.maxHp = 18;
  setup.state.action = 0;
  setup.state.player.hp = 20;
  setup.state.zones.hand = [
    { id: "key", pair: "Key & Lock", face: "light", kept: false },
    { id: "ivy", pair: "Ivy & Thorns", face: "light", kept: false },
    { id: "angel", pair: "Angel & Vampire", face: "light", kept: false },
  ];
  setup.state.zones.library = [{ id: "sun", pair: "Sun & Moon", face: "light", kept: false }];
  setup.state.zones.discard = [];
  setup.state.zones.banished = [];

  const aggressive = restoreSession(setup, runHandler);
  for (const id of ["key", "angel", "ivy"])
    expect(aggressive.dispatch({ type: "play", id }).decision.accepted).toBe(true);
  expect(aggressive.getSnapshot().state.zones.hand.map((card) => [card.id, card.face])).toEqual([
    ["sun", "dark"],
  ]);
  expect(aggressive.getSnapshot().state.enemy.hp).toBe(9); // Vampire 5 with weakness, then Thorns 2 + 2.
  expect(aggressive.getSnapshot().state.player.hp).toBe(25);
  aggressive.dispatch({ type: "end" });
  expect(aggressive.getSnapshot().state.player.hp).toBe(21);

  const defensive = restoreSession(setup, runHandler);
  for (const id of ["ivy", "key", "angel"])
    expect(defensive.dispatch({ type: "play", id }).decision.accepted).toBe(true);
  expect(defensive.getSnapshot().state.enemy).toMatchObject({ hp: 13, curse: 2 });
  expect(defensive.getSnapshot().state.player.hp).toBe(25);
  defensive.dispatch({ type: "end" });
  expect(defensive.getSnapshot().state.player.hp).toBe(23);
});

it("the Weaver's returned kept cards consume normal draw slots, unless its trait is Hushed", () => {
  for (const hush of [false, true]) {
    const setup = structuredClone(createRun(19).getSnapshot());
    setup.state.encounters![0] = "the-fogbound-weaver";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 28;
    setup.state.action = 1;
    setup.state.zones.hand = [
      { id: "held", pair: "Sun & Moon", face: "light", kept: true },
      { id: "lock", pair: "Key & Lock", face: "dark", kept: false },
      { id: "silence", pair: "Silence & Clamor", face: "light", kept: false },
    ];
    setup.state.zones.library = Array.from({ length: 8 }, (_, index) => ({
      id: `fresh-${index}`,
      pair: "Bloom & Wither",
      face: "light" as const,
      kept: false,
    }));
    setup.state.zones.discard = [];
    setup.state.zones.banished = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "lock" }).decision.accepted).toBe(true);
    if (hush) expect(game.dispatch({ type: "play", id: "silence" }).decision.accepted).toBe(true);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const hand = game.getSnapshot().state.zones.hand;
    expect(hand.map((card) => card.id)).toEqual([
      "held",
      "lock",
      "fresh-7",
      "fresh-6",
      "fresh-5",
      ...(hush ? ["fresh-4", "fresh-3"] : []),
    ]);
    expect(game.getSnapshot().state.player.hp).toBe(26);
    expect(hand.every((card) => !card.kept)).toBe(true);
  }
});

it("the Jackrabbit places the top library card at the bottom without changing its face", () => {
  for (const hush of [false, true]) {
    const setup = structuredClone(createRun(19).getSnapshot());
    setup.state.encounters![0] = "the-ink-jackrabbit";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 22;
    setup.state.enemy.hush = hush;
    setup.state.action = 1;
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
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player.hp).toBe(25);
    expect(state.zones.library.map((card) => card.id)).toEqual(
      hush ? ["bottom", "middle", "top"] : ["top", "bottom", "middle"],
    );
    expect(state.zones.library.find((card) => card.id === "top")?.face).toBe("dark");
  }
});
