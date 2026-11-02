// Adapted from Alchemy's src/lib/rng/index.ts. See README for provenance.
export type Rng = () => number;

const UINT32_RANGE = 0x1_0000_0000;

export function createSeededRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function rngInt(rng: Rng, size: number): number {
  if (!Number.isInteger(size) || size <= 0) throw new Error("rngInt requires a positive integer range");
  const draw = rng();
  if (!(draw >= 0 && draw < 1)) throw new Error("Rng draw out of range");
  return Math.floor(draw * size);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = rngInt(rng, index + 1);
    const item = result[index]!;
    result[index] = result[swapIndex]!;
    result[swapIndex] = item;
  }
  return result;
}
