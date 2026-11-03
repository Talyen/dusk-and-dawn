import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import sharp from "sharp";

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

test("desktop fullscreen control changes the native window and rejects invalid input", async () => {
  test.skip(
    Boolean(process.env.DUSK_ELECTRON_EXECUTABLE),
    "Packaged application coverage uses its own build",
  );
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-display-"));
  try {
    const app = await electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
    try {
      const page = await app.firstWindow();
      await page.getByRole("button", { name: "Options" }).click();
      const toggle = page.getByRole("switch", { name: "Fullscreen" });
      await toggle.click();
      await expect(toggle).toBeChecked();
      await expect
        .poll(() =>
          app.evaluate(({ BrowserWindow }) => {
            const window = BrowserWindow.getAllWindows()[0];
            return process.platform === "darwin" ? window?.isSimpleFullScreen() : window?.isFullScreen();
          }),
        )
        .toBe(true);
      await toggle.click();
      await expect(toggle).not.toBeChecked();
      await expect
        .poll(() =>
          app.evaluate(({ BrowserWindow }) => {
            const window = BrowserWindow.getAllWindows()[0];
            return process.platform === "darwin" ? window?.isSimpleFullScreen() : window?.isFullScreen();
          }),
        )
        .toBe(false);
      expect(
        await page.evaluate(async () => {
          try {
            await (
              globalThis as unknown as { duskDesktop: { setFullscreen(value: unknown): Promise<boolean> } }
            ).duskDesktop.setFullscreen("bad");
            return false;
          } catch {
            return true;
          }
        }),
      ).toBe(true);
    } finally {
      await app.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop Collection shows keyword inspection without opening a dialog", async () => {
  test.skip(
    Boolean(process.env.DUSK_ELECTRON_EXECUTABLE),
    "Packaged application coverage uses its own build",
  );
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-collection-"));
  try {
    const app = await electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
    try {
      const page = await app.firstWindow();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("button", { name: "Collection" }).click();
      await page.getByRole("img", { name: "Player card 1" }).hover();
      await expect(page.getByRole("tooltip")).toContainText("Sample Keyword A");
      await expect(page.locator(".ambient-background")).toHaveAttribute("data-primary", "#8dd9cb");
      const first = (await page.getByRole("img", { name: "Player card 1" }).boundingBox())!;
      const second = (await page.getByRole("img", { name: "Player card 2" }).boundingBox())!;
      const viewportWidth = await page.evaluate(() => innerWidth);
      const { data, info } = await sharp(await page.screenshot())
        .raw()
        .toBuffer({ resolveWithObject: true });
      const scale = info.width / viewportWidth;
      const center = (rect: { x: number; y: number; width: number; height: number }) => {
        const x = Math.floor((rect.x + rect.width / 2) * scale);
        const y = Math.floor((rect.y + rect.height / 2) * scale);
        const offset = (y * info.width + x) * info.channels;
        return [data[offset]!, data[offset + 1]!, data[offset + 2]!];
      };
      const hovered = center(first),
        resting = center(second);
      for (let channel = 0; channel < 3; channel++)
        expect(Math.abs(hovered[channel]! - resting[channel]!)).toBeLessThan(8);
      await page.getByRole("img", { name: "Player card 1" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("button", { name: "Open game menu" }).click();
      await page.getByRole("dialog", { name: "Game menu" }).getByRole("button", { name: "Options" }).click();
      await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
    } finally {
      await app.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop quit closes only its application", async () => {
  test.skip(
    Boolean(process.env.DUSK_ELECTRON_EXECUTABLE),
    "Packaged application coverage uses its own build",
  );
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-quit-"));
  try {
    const app = await electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
    const desktopProcess = app.process();
    const exited = new Promise<void>((resolve) => desktopProcess.once("exit", () => resolve()));
    try {
      const page = await app.firstWindow();
      await expect(page.getByRole("button", { name: "Quit" })).toBeVisible();
      await page.getByRole("button", { name: "Quit" }).click({ noWaitAfter: true });
      await exited;
    } finally {
      if (desktopProcess.exitCode === null && desktopProcess.signalCode === null) await app.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
