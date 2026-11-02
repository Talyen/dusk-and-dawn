import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

test("opens the built renderer and recovers a retained save", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-"));
  const executablePath = process.env.DUSK_ELECTRON_EXECUTABLE;
  const args = [...(executablePath ? [] : ["."]), `--user-data-dir=${directory}`];
  const launch = () =>
    electron.launch({
      ...(executablePath ? { executablePath } : {}),
      args,
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    const app = await launch();
    try {
      const page = await app.firstWindow();
      await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
      expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe(
        "undefined",
      );
      expect(await page.evaluate(() => typeof (globalThis as { process?: unknown }).process)).toBe(
        "undefined",
      );
      const saves = await page.evaluate(async () => {
        const bridge = (
          globalThis as unknown as {
            duskDesktop: { writeSave(data: string): Promise<void>; readSaveCandidates(): Promise<string[]> };
          }
        ).duskDesktop;
        await bridge.writeSave(JSON.stringify({ version: 1, revision: 1, random: 42, state: {} }));
        await bridge.writeSave(JSON.stringify({ version: 1, revision: 2, random: 43, state: {} }));
        try {
          await bridge.writeSave('{"version":1,"revision":3,"random":43,"state":{"bad":1e999}}');
          throw new Error("Invalid save was accepted");
        } catch (error) {
          if (error instanceof Error && error.message === "Invalid save was accepted") throw error;
        }
        return bridge.readSaveCandidates();
      });
      expect(saves.map((save) => JSON.parse(save).revision)).toEqual([2, 1]);
    } finally {
      await app.close();
    }
    await writeFile(join(directory, "saves", "save.json"), "corrupt");
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      const candidates = await page.evaluate(() =>
        (
          globalThis as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } }
        ).duskDesktop.readSaveCandidates(),
      );
      expect(candidates[0]).toBe("corrupt");
      expect(JSON.parse(candidates[1]!).revision).toBe(1);
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("opens the development renderer in Electron", async () => {
  test.skip(Boolean(process.env.DUSK_ELECTRON_EXECUTABLE), "Packaged applications use the built renderer");
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-dev-"));
  try {
    const app = await electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "http://127.0.0.1:5173" },
    });
    try {
      const page = await app.firstWindow();
      await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
    } finally {
      await app.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
