import { expect, it } from "vitest";
import { createRun, getEnemy, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import { stateRng } from "../../src/lib/game/random-state";

function encounter(id: string, action: number) {
  const snapshot = structuredClone(createRun(9).getSnapshot());
  snapshot.state.encounters = [id, "fixture:0", "fixture:0", "fixture:0", "fixture:4"];
  snapshot.state.action = action;
  snapshot.state.enemy.maxHp = 100;
  snapshot.state.enemy.hp = 20;
  snapshot.state.zones.hand = [];
  return snapshot;
}

it("partially bypasses Ward on only the base hit", () => {
  const snapshot = encounter("sunbleached-harlequin", 1);
  snapshot.state.player.ward = 5;
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.player.hp).toBe(27);
  expect(game.getSnapshot().state.player.ward).toBe(1); // two absorbed, then the remaining three halve
});

it("checks Lantern Eater's Burn condition once after the tick", () => {
  for (const [burn, expected] of [
    [6, 17],
    [1, 19],
  ] as const) {
    const snapshot = encounter("lantern-eater", 1);
    snapshot.state.enemy.burn = burn;
    const game = restoreSession(snapshot, runHandler);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.enemy.hp).toBe(expected);
    expect(game.getSnapshot().state.enemy.burn).toBe(0);
  }
});

it("Hush suppresses the Swan's displayed reflection immediately", () => {
  const snapshot = encounter("the-mirror-eyed-swan", 1);
  snapshot.state.enemy.reflect = true;
  snapshot.state.zones.hand = [
    { id: "silence", pair: "Silence & Clamor", face: "light", kept: false },
    { id: "sun", pair: "Sun & Moon", face: "light", kept: false },
  ];
  const game = restoreSession(snapshot, runHandler);
  expect(game.dispatch({ type: "play", id: "silence" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.enemy.reflect).toBe(false);
  game.dispatch({ type: "play", id: "sun" });
  expect(game.getSnapshot().state.enemy.hp).toBeLessThan(20);
  expect(game.getSnapshot().state.player.hp).toBe(30);
});

it("the Raven copies this turn's latest final direct hit and clears it next turn", () => {
  const snapshot = encounter("the-painted-raven", 1);
  snapshot.state.zones.hand = [{ id: "sun", pair: "Sun & Moon", face: "light", kept: false }];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "play", id: "sun" });
  const hit = game.getSnapshot().state.latestDirectHit!;
  expect(hit).toBeGreaterThanOrEqual(3);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.player.hp).toBe(30 - Math.min(8, hit));
  expect(game.getSnapshot().state.latestDirectHit).toBeUndefined();
});

it("the Librarian reacts once per attack card through Ward and Hush stops it", () => {
  const snapshot = encounter("the-thorned-librarian", 1);
  snapshot.state.player.ward = 1;
  snapshot.state.zones.hand = [{ id: "sun", pair: "Sun & Moon", face: "light", kept: false }];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "play", id: "sun" });
  expect(game.getSnapshot().state.player.ward).toBe(0);
  expect(game.getSnapshot().state.player.hp).toBe(30);
  const suppressed = structuredClone(snapshot);
  suppressed.state.enemy.hush = true;
  const game2 = restoreSession(suppressed, runHandler);
  game2.dispatch({ type: "play", id: "sun" });
  expect(game2.getSnapshot().state.player.ward).toBe(1);
});

it("applies a queued hand-facing change after the normal draw", () => {
  const snapshot = encounter("the-cracked-moon", 0);
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.zones.hand.length).toBeGreaterThan(0);
  expect(game.getSnapshot().state.zones.hand.every((card) => card.face === "dark")).toBe(true);
});

it("moves only a card retained after discard for a held-card trait", () => {
  const snapshot = encounter("the-brass-matron", 1);
  snapshot.state.zones.hand = [
    { id: "kept", pair: "Sun & Moon", face: "dark", kept: true },
    { id: "discarded", pair: "Angel & Vampire", face: "light", kept: false },
  ];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  const state = game.getSnapshot().state;
  expect(state.zones.discard.map((card) => card.id)).toContain("discarded");
  expect([...state.zones.library, ...state.zones.hand].map((card) => card.id)).toContain("kept");
  expect(getEnemy(state).name).toBe("The Brass Matron");
});

it("keeps the larger queued penalty instead of adding enemy reductions", () => {
  const draw = encounter("the-marble-nurse", 1);
  draw.state.player.nextDrawPenalty = 3;
  const drawGame = restoreSession(draw, runHandler);
  drawGame.dispatch({ type: "end" });
  expect(drawGame.getSnapshot().state.zones.hand).toHaveLength(2);
  expect(drawGame.getSnapshot().state.player.nextDrawPenalty).toBe(0);

  const mana = encounter("the-pearl-taxman", 1);
  mana.state.player.nextManaPenalty = 2;
  const manaGame = restoreSession(mana, runHandler);
  manaGame.dispatch({ type: "end" });
  expect(manaGame.getSnapshot().state.mana).toBe(1);
  expect(manaGame.getSnapshot().state.player.nextManaPenalty).toBe(0);
});

it("the Fogbound Weaver samples held cards randomly but puts them in original hand order", () => {
  for (const seed of Array.from({ length: 32 }, (_, index) => index)) {
    const snapshot = encounter("the-fogbound-weaver", 1);
    snapshot.random.value = seed;
    snapshot.state.player.nextDrawPenalty = 5;
    snapshot.state.zones.hand = Array.from({ length: 4 }, (_, index) => ({
      id: `held-${index}`,
      pair: "Sun & Moon",
      face: index % 2 ? ("dark" as const) : ("light" as const),
      kept: true,
    }));
    snapshot.state.zones.library = [{ id: "existing", pair: "Angel & Vampire", face: "light", kept: false }];
    snapshot.state.zones.discard = [];
    const rng = stateRng({ ...snapshot.random });
    const pool = snapshot.state.zones.hand.slice();
    const chosen = new Set(
      Array.from({ length: 2 }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]!.id),
    );
    const expected = snapshot.state.zones.hand
      .filter((card) => chosen.has(card.id))
      .map((card) => ({ ...card, kept: false }));
    const game = restoreSession(snapshot, runHandler);
    expect(game.dispatch({ type: "end" }).decision.accepted).toBe(true);
    const zones = game.getSnapshot().state.zones;
    expect(zones.library.slice(-2).reverse(), `seed ${seed}`).toEqual(expected);
    expect(zones.library[0]!.id).toBe("existing");
    expect(zones.hand.map((card) => card.id)).toEqual(
      snapshot.state.zones.hand.filter((card) => !chosen.has(card.id)).map((card) => card.id),
    );
  }
});

it("the Fogbound Weaver handles fewer than two held cards and Hush suppresses movement", () => {
  for (const count of [0, 1] as const) {
    const snapshot = encounter("the-fogbound-weaver", 1);
    snapshot.state.player.nextDrawPenalty = 5;
    snapshot.state.zones.hand = Array.from({ length: count }, (_, index) => ({
      id: `held-${index}`,
      pair: "Sun & Moon",
      face: "dark" as const,
      kept: true,
    }));
    snapshot.state.zones.library = [];
    snapshot.state.zones.discard = [];
    const game = restoreSession(snapshot, runHandler);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(count ? ["held-0"] : []);
    expect(game.getSnapshot().state.zones.hand).toHaveLength(0);
    expect(game.getSnapshot().state.player.hp).toBe(26);
  }
  const snapshot = encounter("the-fogbound-weaver", 1);
  snapshot.state.player.nextDrawPenalty = 5;
  snapshot.state.enemy.hush = true;
  snapshot.state.zones.hand = [{ id: "held", pair: "Sun & Moon", face: "dark", kept: true }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.zones.hand.map((card) => card.id)).toEqual(["held"]);
  expect(game.getSnapshot().state.zones.library).toHaveLength(0);
  expect(game.getSnapshot().state.player.hp).toBe(26);
});

it("the Regent moves the top library block to discard without reversing it", () => {
  const snapshot = encounter("the-moth-eaten-regent", 1);
  snapshot.state.zones.hand = Array.from({ length: 8 }, (_, index) => ({
    id: `held-${index}`,
    pair: "Sun & Moon",
    face: "light" as const,
    kept: true,
  }));
  snapshot.state.zones.library = ["bottom", "middle", "next", "top"].map((id) => ({
    id,
    pair: "Angel & Vampire",
    face: "dark" as const,
    kept: false,
  }));
  snapshot.state.zones.discard = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  const state = game.getSnapshot().state;
  expect(state.player.hp).toBe(26);
  expect(state.zones.library.map((card) => card.id)).toEqual(["bottom", "middle"]);
  expect(state.zones.discard.map((card) => card.id)).toEqual(["next", "top"]);
  expect(state.zones.discard.every((card) => card.face === "dark")).toBe(true);
});

it("the Violinist recovers the current top discard after end-turn discard", () => {
  const snapshot = encounter("the-buried-violinist", 1);
  snapshot.state.player.nextDrawPenalty = 5;
  snapshot.state.zones.hand = [
    { id: "kept", pair: "Sun & Moon", face: "light", kept: true },
    { id: "discard-first", pair: "Sun & Moon", face: "light", kept: false },
    { id: "discard-last", pair: "Angel & Vampire", face: "dark", kept: false },
  ];
  snapshot.state.zones.library = [{ id: "old-top", pair: "Sun & Moon", face: "light", kept: false }];
  snapshot.state.zones.discard = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  const zones = game.getSnapshot().state.zones;
  expect(zones.library.map((card) => card.id)).toEqual(["old-top", "discard-last"]);
  expect(zones.library.at(-1)?.face).toBe("dark");
  expect(zones.discard.map((card) => card.id)).toEqual(["discard-first"]);
  expect(zones.hand.map((card) => card.id)).toEqual(["kept"]);
});

it("the Dentist removes Ward before attacking, while Hush preserves it", () => {
  const snapshot = encounter("the-ivory-dentist", 1);
  snapshot.state.player.ward = 8;
  const normal = restoreSession(snapshot, runHandler);
  normal.dispatch({ type: "end" });
  expect(normal.getSnapshot().state.player).toMatchObject({ hp: 29, ward: 0 });
  const suppressed = structuredClone(snapshot);
  suppressed.state.enemy.hush = true;
  const muted = restoreSession(suppressed, runHandler);
  muted.dispatch({ type: "end" });
  expect(muted.getSnapshot().state.player).toMatchObject({ hp: 30, ward: 2 });
});

it("the Starved Banquet Leeches through Ward, unless its trait is Hushed", () => {
  const snapshot = encounter("the-starved-banquet", 1);
  snapshot.state.player.ward = 10;
  const normal = restoreSession(snapshot, runHandler);
  normal.dispatch({ type: "end" });
  expect(normal.getSnapshot().state.enemy.hp).toBe(25);
  expect(normal.getSnapshot().state.player).toMatchObject({ hp: 30, ward: 2 });
  const suppressed = structuredClone(snapshot);
  suppressed.state.enemy.hush = true;
  const muted = restoreSession(suppressed, runHandler);
  muted.dispatch({ type: "end" });
  expect(muted.getSnapshot().state.enemy.hp).toBe(20);
});

it("the Janitor clears both enemy statuses after they tick, unless Hushed", () => {
  const snapshot = encounter("the-majestic-janitor", 1);
  snapshot.state.enemy.burn = 4;
  snapshot.state.enemy.poison = 3;
  const normal = restoreSession(snapshot, runHandler);
  normal.dispatch({ type: "end" });
  expect(normal.getSnapshot().state.enemy).toMatchObject({ hp: 13, burn: 0, poison: 0 });
  const suppressed = structuredClone(snapshot);
  suppressed.state.enemy.hush = true;
  const muted = restoreSession(suppressed, runHandler);
  muted.dispatch({ type: "end" });
  expect(muted.getSnapshot().state.enemy).toMatchObject({ hp: 13, burn: 2, poison: 1 });
});

it("the Wax Regent's new Burn begins ticking on the next turn", () => {
  const snapshot = encounter("the-wax-regent", 1);
  snapshot.state.player.nextDrawPenalty = 5;
  snapshot.state.zones.hand = [{ id: "kept", pair: "Sun & Moon", face: "dark", kept: true }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.player).toMatchObject({ hp: 26, burn: 1 });
  expect(game.getSnapshot().state.zones.library.map((card) => card.id)).toEqual(["kept"]);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.player).toMatchObject({ hp: 20, burn: 0 });
});

it("turning held cards occurs before draw, whereas the Sunken Sun turns after draw", () => {
  const snapshot = encounter("the-threaded-monarch", 1);
  snapshot.state.player.nextDrawPenalty = 4;
  snapshot.state.zones.hand = [{ id: "kept", pair: "Sun & Moon", face: "dark", kept: true }];
  snapshot.state.zones.library = [{ id: "drawn", pair: "Angel & Vampire", face: "dark", kept: false }];
  snapshot.state.zones.discard = [];
  const monarch = restoreSession(snapshot, runHandler);
  monarch.dispatch({ type: "end" });
  expect(monarch.getSnapshot().state.zones.hand.map((card) => [card.id, card.face])).toEqual([
    ["kept", "light"],
    ["drawn", "dark"],
  ]);
  const sun = structuredClone(snapshot);
  sun.state.encounters![0] = "the-sunken-sun";
  sun.state.zones.hand[0]!.face = "light";
  sun.state.zones.library[0]!.face = "light";
  const afterDraw = restoreSession(sun, runHandler);
  afterDraw.dispatch({ type: "end" });
  expect(afterDraw.getSnapshot().state.zones.hand.map((card) => [card.id, card.face])).toEqual([
    ["kept", "dark"],
    ["drawn", "dark"],
  ]);
});

it("the Swan's displayed reflection remains active while Frozen and expires on the skipped action", () => {
  const snapshot = encounter("the-mirror-eyed-swan", 1);
  snapshot.state.enemy.freeze = true;
  snapshot.state.enemy.reflect = true;
  snapshot.state.zones.hand = [{ id: "sun", pair: "Sun & Moon", face: "light", kept: false }];
  const game = restoreSession(snapshot, runHandler);
  expect(game.dispatch({ type: "play", id: "sun" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player.hp).toBe(24);
  expect(game.getSnapshot().state.enemy.hp).toBe(20);
  expect(game.getSnapshot().state.enemy.freeze).toBe(true);
  game.dispatch({ type: "end" });
  expect(game.getSnapshot().state.player.hp).toBe(24);
  expect(game.getSnapshot().state.enemy.freeze).toBe(false);
  expect(game.getSnapshot().state.enemy.reflect).toBe(false);
  expect(game.getSnapshot().state.action).toBe(0);
});

it("the Librarian does not retaliate after a lethal attack, even when Frozen", () => {
  const snapshot = encounter("the-thorned-librarian", 1);
  snapshot.state.enemy.freeze = true;
  snapshot.state.enemy.hp = 1;
  snapshot.state.zones.hand = [{ id: "sun", pair: "Sun & Moon", face: "light", kept: false }];
  const game = restoreSession(snapshot, runHandler);
  expect(game.dispatch({ type: "play", id: "sun" }).decision.accepted).toBe(true);
  expect(game.getSnapshot().state.player.hp).toBe(30);
  expect(game.getSnapshot().state.phase).toBe("reward");
});
