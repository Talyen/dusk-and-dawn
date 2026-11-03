import { expect, it } from "vitest";
import { createRun, type RunState } from "../../src/lib/game/run";
import { encodeRun, readRun, resumeRun } from "../../src/lib/game/run-save";
import type { SaveBackend } from "../../src/lib/save/save";
import { snapshotToSave, encodeSave } from "../../src/lib/save/save";

it("restores state and the random stream so future actions replay identically", async () => {
  const original = createRun(404);
  original.dispatch({ type: "end" });
  const backend: SaveBackend = {
    readCandidates: async () => [encodeRun(original.getSnapshot())],
    write: async () => {},
  };
  const restored = resumeRun((await readRun(backend))!);
  expect(restored.getSnapshot()).toEqual(original.getSnapshot());
  expect(restored.dispatch({ type: "end" }).snapshot).toEqual(original.dispatch({ type: "end" }).snapshot);
});

it("recovers the retained run when the primary has a valid envelope but invalid game state", async () => {
  const good = createRun(10).getSnapshot();
  const bad = structuredClone(good);
  bad.state.zones.hand.push(bad.state.zones.hand[0]!);
  const backend: SaveBackend = {
    readCandidates: async () => [encodeRun(bad), encodeRun(good)],
    write: async () => {},
  };
  expect(await readRun(backend)).toEqual(good);
});

it("rejects unrelated or malformed save data without overwriting it", async () => {
  const data = encodeSave(snapshotToSave({ revision: 1, random: { value: 1 }, state: {} as RunState }));
  const backend: SaveBackend = {
    readCandidates: async () => [data],
    write: async () => {
      throw new Error("unexpected write");
    },
  };
  await expect(readRun(backend)).rejects.toThrow("No valid saved run");
});

it("keeps the retained browser copy if the first recovered write fails", async () => {
  const { browserSaveBackend } = await import("../../src/lib/save/save");
  const { readRunWithRecovery } = await import("../../src/lib/game/run-save");
  const good = encodeRun(createRun(10).getSnapshot());
  const invalid = JSON.parse(good);
  invalid.state.run.player.hp = 999;
  const data = new Map([
    ["dusk-and-dawn.save.v1", JSON.stringify(invalid)],
    ["dusk-and-dawn.save.v1.backup", good],
  ]);
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key === "dusk-and-dawn.save.v1") throw new Error("storage failure");
      data.set(key, value);
    },
  } as unknown as Storage;
  const backend = browserSaveBackend(storage);
  expect((await readRunWithRecovery(backend))?.recovered).toBe(true);
  await expect(backend.write(good, { preserveBackup: true })).rejects.toThrow("storage failure");
  expect(data.get("dusk-and-dawn.save.v1.backup")).toBe(good);
});
