import type { Rng } from "../random";

/** Serializable state for the same seeded generator used by createSeededRng. */
export interface RandomState {
  value: number;
}
export function randomState(seed: number): RandomState {
  if (!Number.isFinite(seed)) throw new Error("Seed must be finite");
  return { value: seed >>> 0 };
}
export function stateRng(state: RandomState): Rng {
  return () => {
    state.value = (state.value + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state.value ^ (state.value >>> 15), 1 | state.value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}
