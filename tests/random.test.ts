import { describe, expect, it } from "vitest";
import { createSeededRng, rngInt, shuffle } from "../src/lib/random";

describe("seeded randomness", () => {
  it("repeats the same sequence for the same seed", () => {
    const first = createSeededRng(42);
    const second = createSeededRng(42);
    expect(Array.from({ length: 10 }, first)).toEqual(Array.from({ length: 10 }, second));
    expect(createSeededRng(42)()).not.toBe(createSeededRng(43)());
  });

  it("selects within a range and rejects invalid inputs", () => {
    expect(rngInt(() => 0, 3)).toBe(0);
    expect(rngInt(() => 0.999, 3)).toBe(2);
    expect(() => rngInt(() => 1, 3)).toThrow();
    expect(() => rngInt(() => 0, 0)).toThrow();
  });

  it("shuffles deterministically without changing the input", () => {
    const cards = [1, 2, 3, 4, 5];
    const result = shuffle(cards, createSeededRng(7));
    expect(result).toEqual(shuffle(cards, createSeededRng(7)));
    expect([...result].sort()).toEqual(cards);
    expect(cards).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not draw for empty or single-item lists", () => {
    const noDraw = () => {
      throw new Error("unexpected draw");
    };
    expect(shuffle([], noDraw)).toEqual([]);
    expect(shuffle(["card"], noDraw)).toEqual(["card"]);
  });
});
