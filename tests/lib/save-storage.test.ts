import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { createSaveStorage } = require("../../desktop/save.cjs") as {
  createSaveStorage(path: string): {
    write(data: string, preserveBackup?: boolean): Promise<void>;
    readCandidates(): Promise<string[]>;
  };
};

it("preserves a recovered desktop backup on the next atomic write", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-save-recovery-"));
  const storage = createSaveStorage(directory);
  const data = (revision: number) => JSON.stringify({ version: 1, revision, random: 1, state: {} });
  try {
    await storage.write(data(1));
    await storage.write(data(2));
    await storage.write(data(3), true);
    expect((await storage.readCandidates()).map((entry) => JSON.parse(entry).revision)).toEqual([3, 1]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
