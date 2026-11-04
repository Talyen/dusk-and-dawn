import { describe, expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun, readRunWithRecovery } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";

type Game = ReturnType<typeof createRun>;
function win(game: Game): Game {
  const snapshot = structuredClone(game.getSnapshot());
  snapshot.state.enemy.hp = 1;
  const zones = snapshot.state.zones;
  const card = [...zones.hand, ...zones.library, ...zones.discard].find(
    (item) => item.pair === "Sun & Moon",
  )!;
  zones.hand = zones.hand.filter((item) => item.id !== card.id);
  zones.library = zones.library.filter((item) => item.id !== card.id);
  zones.discard = zones.discard.filter((item) => item.id !== card.id);
  card.face = "light";
  zones.hand.push(card);
  snapshot.state.mana = 3;
  const resumed = restoreSession(snapshot, runHandler);
  expect(resumed.dispatch({ type: "play", id: card.id }).decision.accepted).toBe(true);
  expect(resumed.getSnapshot().state.phase).toBe("reward");
  return resumed;
}

describe("reward variety", () => {
  it.each(["skip", "pick"] as const)(
    "prefers fresh choices after %s, including after save and reload",
    async (choice) => {
      let game = createRun(
        10,
        { id: "variety", tier: 1, orientation: "light", relic: "none" },
        "thorn-witch",
      );
      game = win(game);
      const first = game.getSnapshot().state.offers;
      expect(first).toHaveLength(3);
      expect(
        game.dispatch({ type: "reward", pair: choice === "pick" ? first[0]! : null }).decision.accepted,
      ).toBe(true);
      expect(game.getSnapshot().state.lastOffers).toEqual(first);
      const saved = await readRunWithRecovery({
        readCandidates: async () => [encodeRun(game.getSnapshot())],
        write: async () => {},
      });
      expect(saved?.snapshot).toEqual(game.getSnapshot());
      game = restoreSession(saved!.snapshot, runHandler);
      expect(game.dispatch({ type: "route", choice: "rest" }).decision.accepted).toBe(true);
      game = win(game);
      const second = game.getSnapshot().state.offers;
      expect(second).toHaveLength(3);
      expect(second.filter((pair) => first.includes(pair))).toEqual([]);
      const resumed = await readRunWithRecovery({
        readCandidates: async () => [encodeRun(game.getSnapshot())],
        write: async () => {},
      });
      expect(resumed?.snapshot).toEqual(game.getSnapshot());
    },
  );

  it("does not offer two pairs with identical effects when other choices are available", () => {
    const game = win(
      createRun(40, { id: "distinct", tier: 1, orientation: "light", relic: "none" }, "thorn-witch"),
    );
    const offers = game.getSnapshot().state.offers;
    const effects = offers.map((pair) => [cards[pair]!.light.effect, cards[pair]!.dark.effect]);
    expect(new Set(effects.map((effect) => JSON.stringify(effect))).size).toBe(offers.length);
  });

  it("prefers distinct effects on both faces without excluding either shared-face pair", () => {
    const choices = [
      "Red Panda & Clouded Leopard",
      "Perfumer & Scent Thief",
      "Wax Seal & Torn Letter",
      "Wooden Spool & Loose Thread",
    ];
    const seen = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      const snapshot = structuredClone(createRun(seed).getSnapshot());
      snapshot.state.deck = Object.keys(cards)
        .filter((pair) => !choices.includes(pair))
        .map((pair, index) => ({ id: `card-${index}`, pair }));
      const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
      snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
      snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
      snapshot.state.zones.discard = [];
      snapshot.state.zones.banished = [];
      const offers = win(restoreSession(snapshot, runHandler)).getSnapshot().state.offers;
      expect(offers).toHaveLength(3);
      for (const side of ["light", "dark"] as const)
        expect(new Set(offers.map((pair) => cards[pair]![side].effect)).size).toBe(3);
      for (const pair of offers) seen.add(pair);
    }
    expect(seen).toEqual(new Set(choices));
  });

  it("retains both shared-face pairs when their different opposite faces are needed", () => {
    const snapshot = structuredClone(createRun(19).getSnapshot());
    const choices = ["Red Panda & Clouded Leopard", "Perfumer & Scent Thief", "Wax Seal & Torn Letter"];
    snapshot.state.deck = Object.keys(cards)
      .filter((pair) => !choices.includes(pair))
      .map((pair, index) => ({ id: `card-${index}`, pair }));
    const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
    snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    const game = win(restoreSession(snapshot, runHandler));
    expect(new Set(game.getSnapshot().state.offers)).toEqual(new Set(choices));
    expect(cards[choices[0]!]!.dark.effect).not.toBe(cards[choices[1]!]!.dark.effect);
  });

  it.each([
    { pair: "Feather & Chain", face: "light", hand: 3, scry: false, curse: 0, kept: false },
    { pair: "Open Gate & Sealed Gate", face: "light", hand: 3, scry: false, curse: 0, kept: false },
    { pair: "Feather & Chain", face: "dark", hand: 1, scry: false, curse: 2, kept: false },
    { pair: "Open Gate & Sealed Gate", face: "dark", hand: 1, scry: false, curse: 0, kept: true },
    { pair: "Lantern & Shroud", face: "light", hand: 2, scry: true, curse: 0, kept: false },
    { pair: "Sunlit Gallery & Shadow Gallery", face: "light", hand: 2, scry: true, curse: 0, kept: false },
    { pair: "Lantern & Shroud", face: "dark", hand: 1, scry: false, curse: 0, kept: true },
    { pair: "Sunlit Gallery & Shadow Gallery", face: "dark", hand: 1, scry: false, curse: 0, kept: true },
  ] as const)("resolves the matching $pair $face effect", ({ pair, face, hand, scry, curse, kept }) => {
    const state = structuredClone(createRun(12).getSnapshot());
    state.state.deck = [pair, "Sun & Moon", "Angel & Vampire", "Bloom & Wither"].map((item, i) => ({
      id: `card-${i}`,
      pair: item,
    }));
    const [source, held, first, second] = state.state.deck.map((card) => ({
      ...card,
      face: "light" as "light" | "dark",
      kept: false,
    }));
    source!.face = face;
    state.state.zones.hand = [source!, held!];
    state.state.zones.library = [first!, second!];
    state.state.zones.discard = [];
    state.state.zones.banished = [];
    state.state.zones.scry = false;
    const game = restoreSession(state, runHandler);
    expect(game.dispatch({ type: "play", id: source!.id }).decision.accepted).toBe(true);
    const after = game.getSnapshot().state;
    expect(after.zones.hand).toHaveLength(hand);
    expect(after.zones.hand.find((card) => card.id === held!.id)?.kept).toBe(kept);
    expect(after.zones.scry).toBe(scry);
    expect(after.enemy.curse).toBe(curse);
  });

  it("prefers distinct older offers when only one fresh pair remains", () => {
    const snapshot = structuredClone(createRun(19).getSnapshot());
    const choices = [
      "Dream & Nightmare",
      "Compass & Labyrinth",
      "Open Gate & Sealed Gate",
      "Sunlit Gallery & Shadow Gallery",
    ];
    snapshot.state.deck = Object.keys(cards)
      .filter((pair) => !choices.includes(pair))
      .map((pair, index) => ({ id: `card-${index}`, pair }));
    const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
    snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    snapshot.state.lastOffers = choices.slice(1);
    const game = win(restoreSession(snapshot, runHandler));
    const offers = game.getSnapshot().state.offers;
    expect(offers).toContain("Dream & Nightmare");
    expect(offers).not.toContain("Compass & Labyrinth");
    expect(offers).toHaveLength(3);
  });

  it("retains equivalent artwork choices when the remaining pool is small", () => {
    const snapshot = structuredClone(createRun(19).getSnapshot());
    const choices = ["Dream & Nightmare", "Compass & Labyrinth"];
    snapshot.state.deck = Object.keys(cards)
      .filter((pair) => !choices.includes(pair))
      .map((pair, index) => ({ id: `card-${index}`, pair }));
    const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
    snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    const game = win(restoreSession(snapshot, runHandler));
    expect(new Set(game.getSnapshot().state.offers)).toEqual(new Set(choices));
  });

  it("offers a fresh event pair immediately after the reward choices", () => {
    let game = createRun(
      1,
      { id: "event-variety", tier: 1, orientation: "light", relic: "none" },
      "thorn-witch",
    );
    game = win(game);
    const first = game.getSnapshot().state.offers;
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    const route = game.getSnapshot().state.experiment!.route!;
    expect(route.event).toBe("blood");
    expect(first).not.toContain(route.pair);
  });

  it("fills Many Eyes with four fresh choices and accepts older saves", async () => {
    let game = createRun(
      10,
      { id: "eyes", tier: 1, orientation: "light", relic: "many-eyes" },
      "thorn-witch",
    );
    const old = game.getSnapshot();
    const loaded = await readRunWithRecovery({
      readCandidates: async () => [encodeRun(old)],
      write: async () => {},
    });
    expect(loaded?.snapshot).toEqual(old);
    game = win(restoreSession(loaded!.snapshot, runHandler));
    const first = game.getSnapshot().state.offers;
    expect(first).toHaveLength(4);
    game.dispatch({ type: "reward", pair: null });
    game.dispatch({ type: "route", choice: "rest" });
    game = win(game);
    expect(game.getSnapshot().state.offers).toHaveLength(4);
    expect(game.getSnapshot().state.offers.filter((pair) => first.includes(pair))).toEqual([]);
  });

  it("keeps the route event available when its only unowned pair was just offered", () => {
    const initial = structuredClone(
      createRun(9, { id: "small-pool", tier: 3, orientation: "light", relic: "none" }).getSnapshot(),
    );
    const onlyPair = "Cloister Garden & Overgrown Ruins";
    initial.state.deck = Object.keys(cards)
      .filter((pair) => pair !== onlyPair)
      .map((pair, index) => ({ id: `card-${index}`, pair }));
    initial.state.phase = "reward";
    initial.state.offers = [onlyPair];
    const game = restoreSession(initial, runHandler);
    expect(game.dispatch({ type: "reward", pair: null }).decision.accepted).toBe(true);
    expect(game.getSnapshot().state.phase).toBe("route");
    expect(game.getSnapshot().state.experiment!.route!.pair).toBe(onlyPair);
  });

  it("falls back to recent offers when few unowned pairs remain", () => {
    const snapshot = structuredClone(createRun(19).getSnapshot());
    const choices = ["Cloister Garden & Overgrown Ruins", "Bound Soul & Unbound Spirit"];
    const owned = Object.keys(cards).filter((pair) => !choices.includes(pair));
    snapshot.state.deck = owned.map((pair, index) => ({ id: `card-${index}`, pair }));
    const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
    snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    snapshot.state.lastOffers = choices;
    const game = win(restoreSession(snapshot, runHandler));
    expect(game.getSnapshot().state.offers).toHaveLength(2);
    expect(new Set(game.getSnapshot().state.offers)).toEqual(new Set(choices));
  });
});

it("keeps the revised Watchtower distinct from otherwise identical scouting pairs", () => {
  const choices = [
    "Dream & Nightmare",
    "Compass & Labyrinth",
    "Lens & Blindfold",
    "Watchtower & Collapsed Watchtower",
  ];
  for (let seed = 0; seed < 40; seed++) {
    const snapshot = structuredClone(createRun(seed).getSnapshot());
    snapshot.state.deck = Object.keys(cards)
      .filter((pair) => !choices.includes(pair))
      .map((pair, index) => ({ id: `card-${index}`, pair }));
    const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = [fight.find((card) => card.pair === "Sun & Moon")!];
    snapshot.state.zones.library = fight.filter((card) => card.pair !== "Sun & Moon");
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    const offers = win(restoreSession(snapshot, runHandler)).getSnapshot().state.offers;
    expect(offers).toHaveLength(3);
    expect(offers).toContain("Watchtower & Collapsed Watchtower");
    expect(new Set(offers.map((pair) => cards[pair]!.dark.effect)).size).toBe(2);
  }
});
