import { expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import type { FightCard } from "../../src/lib/game/card-zones";

type Face = { pair: string; side: "light" | "dark"; name: string; effect: string };
const catalogue: Face[] = Object.entries(cards).flatMap(([pair, faces]) =>
  (["light", "dark"] as const).map((side) => ({ pair, side, ...faces[side] })),
);
const c = (id: string, face: "light" | "dark" = "light", kept = false): FightCard => ({
  id,
  pair: "Sun & Moon",
  face,
  kept,
});
function fixture(face: Face, held: FightCard[], library: FightCard[], discard: FightCard[]) {
  const snapshot = structuredClone(createRun(4).getSnapshot());
  snapshot.state.zones.hand = [{ id: "source", pair: face.pair, face: face.side, kept: false }, ...held];
  snapshot.state.zones.library = library;
  snapshot.state.zones.discard = discard;
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = false;
  return restoreSession(snapshot, runHandler);
}

it("draw and Scry faces obey printed counts, ordering, hand cap, mana and source disposition", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^(Scry\. )?(?:Gain (\d+) mana\. )?Draw (\d+) cards?\.( Banish this card\.)?$/.exec(
      face.effect,
    );
    if (!match) continue;
    checked++;
    for (const heldCount of [1, 7]) {
      const held = Array.from({ length: heldCount }, (_, index) =>
        c(`held-${index}`, index % 2 ? "dark" : "light", index === 0),
      );
      const library = Array.from({ length: 5 }, (_, index) =>
        c(`library-${index}`, index % 2 ? "dark" : "light"),
      );
      const game = fixture(face, held, library, [c("discard")]);
      expect(game.dispatch({ type: "play", id: "source" }).decision, face.name).toMatchObject({
        accepted: true,
      });
      const state = game.getSnapshot().state;
      const amount = Math.min(Number(match[3]), 8 - heldCount, library.length);
      const drawn = library.slice(-amount).reverse();
      expect(state.zones.hand, `${face.name}, held=${heldCount}`).toEqual([...held, ...drawn]);
      expect(state.zones.library).toEqual(library.slice(0, library.length - amount));
      expect(state.zones.scry).toBe(!!match[1]);
      expect(state.mana).toBe(Math.min(3, 2 + Number(match[2] ?? 0)));
      expect(state.zones.discard.map((card) => card.id)).toEqual(
        match[4] ? ["discard"] : ["discard", "source"],
      );
      expect(state.zones.banished.map((card) => card.id)).toEqual(match[4] ? ["source"] : []);
    }
  }
  expect(checked).toBe(61);
});

it("pure Scry follows an empty library without revealing or reshuffling the discard pile", () => {
  const faces = catalogue.filter((face) => face.effect === "Scry.");
  expect(faces).toHaveLength(4);
  for (const face of faces) {
    const game = fixture(face, [], [], [c("discard", "dark")]);
    const before = game.getSnapshot().random;
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.scry).toBe(true);
    expect(state.zones.library).toEqual([]);
    expect(state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
    expect(game.getSnapshot().random).toEqual(before);
  }
});

it("fixed discard returns use the printed end and preserve faces, including an empty pile", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Return the (top|bottom) card of your discard pile to your hand\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const held = Array.from({ length: 7 }, (_, index) => c(`held-${index}`));
    const discard = [c("bottom", "dark"), c("middle"), c("top", "dark")];
    const game = fixture(face, held, [], discard);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const chosen = match[1] === "top" ? discard[2]! : discard[0]!;
    expect(game.getSnapshot().state.zones.hand).toEqual([...held, chosen]);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual([
      ...discard.filter((card) => card.id !== chosen.id).map((card) => card.id),
      "source",
    ]);
    const empty = fixture(face, [], [], []);
    expect(empty.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    expect(empty.getSnapshot().state.zones.hand).toEqual([]);
    expect(empty.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  }
  expect(checked).toBe(25);
});

it("pure fixed discard Banish uses the named end and handles an empty pile", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Banish the (top|bottom) card of your discard pile\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const discard = [c("bottom", "dark"), c("middle"), c("top", "dark")];
    const game = fixture(face, [], [], discard);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const chosen = match[1] === "top" ? discard[2]! : discard[0]!;
    expect(game.getSnapshot().state.zones.banished).toEqual([chosen]);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual([
      ...discard.filter((card) => card.id !== chosen.id).map((card) => card.id),
      "source",
    ]);
    const empty = fixture(face, [], [], []);
    expect(empty.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    expect(empty.getSnapshot().state.zones.banished).toEqual([]);
    expect(empty.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  }
  expect(checked).toBe(17);
});

it("self-Keep and self-Flip resolve the original source on its resulting face", () => {
  const faces = catalogue.filter((face) =>
    ["Keep this card.", "Flip this card. Keep this card."].includes(face.effect),
  );
  expect(faces).toHaveLength(29);
  for (const face of faces) {
    const held = Array.from({ length: 7 }, (_, index) => c(`held-${index}`, index % 2 ? "dark" : "light"));
    const game = fixture(face, held, [], []);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const expectedFace = face.effect.startsWith("Flip")
      ? face.side === "light"
        ? "dark"
        : "light"
      : face.side;
    expect(game.getSnapshot().state.zones.hand).toEqual([
      ...held,
      { id: "source", pair: face.pair, face: expectedFace, kept: true },
    ]);
    expect(game.getSnapshot().state.zones.discard).toEqual([]);
    expect(game.getSnapshot().state.mana).toBe(2);
  }
});

it("whole-hand Flip, Keep, and facing effects change the other held cards only", () => {
  let checked = 0;
  for (const face of catalogue) {
    const turn = /^Turn your hand to its (light|dark) faces\.$/.exec(face.effect);
    if (!["Flip your hand.", "Keep your hand."].includes(face.effect) && !turn) continue;
    checked++;
    const held = [c("first", "light", true), c("second", "dark")];
    const game = fixture(face, held, [], []);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const expected = held.map((card) => ({
      ...card,
      face: turn
        ? turn[1]
        : face.effect === "Flip your hand."
          ? card.face === "light"
            ? "dark"
            : "light"
          : card.face,
      kept: face.effect === "Keep your hand." ? true : card.kept,
    }));
    expect(game.getSnapshot().state.zones.hand, face.name).toEqual(expected);
    expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  }
  expect(checked).toBe(30);
});

it("random Flip and Keep act without replacement and use all available cards", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^(Flip|Keep) (a random card|\d+ random cards) in your hand\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const count = match[2] === "a random card" ? 1 : Number(match[2]!.split(" ")[0]);
    for (const available of [0, 1, 3]) {
      const held = Array.from({ length: available }, (_, index) =>
        c(`held-${index}`, index % 2 ? "dark" : "light"),
      );
      const game = fixture(face, held, [], []);
      const before = game.getSnapshot().random;
      expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
      const actual = game.getSnapshot().state.zones.hand;
      expect(actual.map((card) => card.id)).toEqual(held.map((card) => card.id));
      if (match[1] === "Flip") {
        expect(actual.filter((card, index) => card.face !== held[index]!.face)).toHaveLength(
          Math.min(count, available),
        );
        expect(actual.every((card) => !card.kept)).toBe(true);
      } else {
        expect(actual.filter((card) => card.kept)).toHaveLength(Math.min(count, available));
        expect(actual.map((card) => card.face)).toEqual(held.map((card) => card.face));
      }
      if (available === 0) expect(game.getSnapshot().random).toEqual(before);
      expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
    }
  }
  expect(checked).toBe(18);
});
