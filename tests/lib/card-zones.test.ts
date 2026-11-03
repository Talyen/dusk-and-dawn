import { describe, expect, it } from "vitest";
import {
  discardAtEndTurn,
  drawCards,
  finishSource,
  flipCards,
  keepCards,
  scryTop,
  type CardZones,
  type FightCard,
} from "../../src/lib/game/card-zones";

const card = (id: string): FightCard => ({ id, pair: id, face: "light", kept: false });
const zones = (): CardZones => ({ library: [], hand: [], discard: [], banished: [], scry: false });
const zero = () => 0;

describe("fight card zones", () => {
  it("retains marked cards and discards from left to right, clearing markers and Scry", () => {
    const z = zones();
    z.hand = [card("a"), { ...card("b"), kept: true }, card("c")];
    z.scry = true;
    discardAtEndTurn(z);
    expect(z.hand.map((c) => [c.id, c.kept])).toEqual([["b", false]]);
    expect(z.discard.map((c) => c.id)).toEqual(["a", "c"]);
    expect(z.scry).toBe(false);
  });
  it("obeys the hand cap, preserves faces and reshuffles only when needed", () => {
    const z = zones();
    z.hand = Array.from({ length: 7 }, (_, i) => card(String(i)));
    z.library = [{ ...card("top"), face: "dark" }];
    z.discard = [card("discard")];
    expect(drawCards(z, 5, zero)).toBe(1);
    expect(z.hand.at(-1)?.face).toBe("dark");
    expect(z.discard).toHaveLength(1);
    z.hand.pop();
    expect(drawCards(z, 1, zero)).toBe(1);
    expect(z.hand.at(-1)?.id).toBe("discard");
  });
  it("reveals the changing top without reshuffling", () => {
    const z = zones();
    z.scry = true;
    z.discard.push(card("discard"));
    expect(scryTop(z)).toBeNull();
    z.library.push(card("a"), card("b"));
    expect(scryTop(z)?.id).toBe("b");
    z.library.pop();
    expect(scryTop(z)?.id).toBe("a");
  });
  it("flips and keeps the source on its new face, excluding it from hand targets", () => {
    const z = zones();
    const source = card("source");
    z.hand = [card("a"), card("b")];
    expect(flipCards(z, source, { kind: "hand" }, zero).map((c) => c.id)).toEqual(["a", "b"]);
    flipCards(z, source, { kind: "source" }, zero);
    keepCards(z, source, { kind: "source" }, zero);
    finishSource(z, source);
    expect(z.hand.at(-1)).toMatchObject({ id: "source", face: "dark", kept: true });
  });
  it("samples without replacement and discards a kept source when the hand is full", () => {
    const z = zones();
    const source = card("source");
    z.hand = Array.from({ length: 8 }, (_, i) => card(String(i)));
    const chosen = flipCards(z, source, { kind: "random-hand", count: 12 }, zero);
    expect(new Set(chosen.map((c) => c.id)).size).toBe(8);
    keepCards(z, source, { kind: "source" }, zero);
    finishSource(z, source);
    expect(z.discard.at(-1)).toMatchObject({ id: "source", kept: false });
    expect(z.hand).toHaveLength(8);
  });
});
