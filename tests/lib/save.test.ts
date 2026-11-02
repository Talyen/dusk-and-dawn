import { describe, expect, it } from "vitest";
import { decodeSave, encodeSave } from "../../src/lib/save/save";

describe("save envelope", () => {
  it("round trips JSON data and random state", () => {
    const save = { version: 1 as const, revision: 2, random: 42, state: { cards: ["a"] } };
    expect(decodeSave(encodeSave(save))).toEqual(save);
  });
  it("rejects corrupt and unsupported saves", () => {
    expect(() => decodeSave("{")).toThrow();
    expect(() => decodeSave('{"version":2,"revision":0,"random":1,"state":{}}')).toThrow();
    expect(() => decodeSave('{"version":1,"revision":-1,"random":1,"state":{}}')).toThrow();
  });
});

it("recovers the retained copy when the primary is corrupt", async () => {
  const { readSave } = await import("../../src/lib/save/save");
  const good = encodeSave({ version: 1, revision: 2, random: 3, state: {} });
  const backend = { readCandidates: async () => ["corrupt", good], write: async () => {} };
  expect((await readSave(backend))?.revision).toBe(2);
  await expect(readSave({ ...backend, readCandidates: async () => ["corrupt"] })).rejects.toThrow();
});

it("validates game data when restoring a snapshot", async () => {
  const { z } = await import("zod");
  const { snapshotToSave, snapshotFromSave } = await import("../../src/lib/save/save");
  const snapshot = { revision: 2, random: { value: 42 }, state: { cards: ["a"] } };
  const saved = decodeSave(encodeSave(snapshotToSave(snapshot)));
  expect(snapshotFromSave(saved, z.object({ cards: z.array(z.string()) }))).toEqual(snapshot);
  expect(() => snapshotFromSave(saved, z.object({ cards: z.number() }))).toThrow();
});
