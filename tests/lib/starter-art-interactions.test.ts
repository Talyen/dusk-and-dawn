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

it("Lamb boosts a Radiance hit while Censer protects against the Jackrabbit", () => {
  for (const support of ["lamb", "censer"] as const) {
    const setup = structuredClone(createRun(19).getSnapshot());
    setup.state.encounters![0] = "the-ink-jackrabbit";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 22;
    setup.state.action = 0;
    setup.state.zones.hand = [
      {
        id: "support",
        pair: support === "lamb" ? "Lamb & Wolf" : "Censer & Plague Brazier",
        face: "light",
        kept: false,
      },
      { id: "sun", pair: "Sun & Moon", face: "light", kept: false },
    ];
    setup.state.zones.library = [];
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "support" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.bless).toBe(support === "lamb" ? 2 : 0);
    expect(game.getSnapshot().state.enemy.curse).toBe(support === "censer" ? 2 : 0);
    expect(game.dispatch({ type: "play", id: "sun" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.enemy.hp).toBe(support === "lamb" ? 12 : 14);
    expect(game.getSnapshot().state.player.bless).toBe(0);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.player.hp).toBe(support === "lamb" ? 26 : 28);
  }
});

it("Sealed Gate keeps the other hand, but the Fisher can still hook a kept card", () => {
  for (const action of [0, 1]) {
    const setup = structuredClone(createRun(19).getSnapshot());
    setup.state.encounters![0] = "the-celestial-fisher";
    setup.state.enemy.hp = setup.state.enemy.maxHp = 28;
    setup.state.action = action;
    setup.state.zones.hand = [
      { id: "gate", pair: "Open Gate & Sealed Gate", face: "dark", kept: false },
      { id: "held", pair: "Sun & Moon", face: "light", kept: false },
    ];
    setup.state.zones.library = Array.from({ length: 7 }, (_, index) => ({
      id: `fresh-${index}`,
      pair: "Bloom & Wither",
      face: "light" as const,
      kept: false,
    }));
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "gate" }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.zones.hand).toMatchObject([{ id: "held", kept: true }]);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["gate"]);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player.hp).toBe(action === 0 ? 25 : 26);
    expect(state.zones.hand.some((card) => card.id === "held")).toBe(action === 0);
    expect(state.zones.discard.some((card) => card.id === "held")).toBe(action === 1);
    expect(state.zones.hand.every((card) => !card.kept)).toBe(true);
  }
});

it("opening before sealing preserves the newly drawn cards, while reversing the order does not", () => {
  for (const order of [
    ["open", "sealed"],
    ["sealed", "open"],
  ] as const) {
    const setup = structuredClone(createRun(19).getSnapshot());
    setup.state.zones.hand = [
      { id: "open", pair: "Open Gate & Sealed Gate", face: "light", kept: false },
      { id: "sealed", pair: "Open Gate & Sealed Gate", face: "dark", kept: false },
      { id: "held", pair: "Sun & Moon", face: "light", kept: false },
    ];
    setup.state.zones.library = [
      { id: "bottom", pair: "Bloom & Wither", face: "light", kept: false },
      { id: "top", pair: "Angel & Vampire", face: "dark", kept: false },
    ];
    setup.state.zones.discard = [];
    const game = restoreSession(setup, runHandler);
    for (const id of order) expect(game.dispatch({ type: "play", id }).decision.accepted).toBe(true);
    const hand = game.getSnapshot().state.zones.hand;
    expect(hand.map((card) => card.id)).toEqual(["held", "top", "bottom"]);
    expect(hand.map((card) => card.kept)).toEqual(
      order[0] === "open" ? [true, true, true] : [true, false, false],
    );
    expect(hand.find((card) => card.id === "top")?.face).toBe("dark");
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(order);
  }
});
