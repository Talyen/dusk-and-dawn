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

  it("offers a fresh event pair immediately after the reward choices", () => {
    let game = createRun(
      0,
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
