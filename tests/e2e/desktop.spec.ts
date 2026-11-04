import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";
import { createRun, runHandler } from "../../src/lib/game/run";
import { encodeRun } from "../../src/lib/game/run-save";
import { restoreSession } from "../../src/lib/game/session";

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
      await page.getByRole("img", { name: "Angel" }).hover();
      await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
      await expect(page.locator(".ambient-background")).toHaveAttribute("data-primary", "#8BCBFF");
      await expect(page.getByRole("img", { name: "Angel" }).locator("img")).toHaveJSProperty(
        "complete",
        true,
      );
      await page.getByRole("img", { name: "Angel" }).click();
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

test("desktop resumes a saved combat after relaunch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-run-"));
  const launch = () =>
    electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    const app = await launch();
    try {
      const page = await app.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Start new run" }).click();
      await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "End turn" }).click();
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
              .duskDesktop;
            const [raw] = await bridge.readSaveCandidates();
            return raw ? JSON.parse(raw).state.run.player.hp : null;
          }),
        )
        .toBe(26);
    } finally {
      await app.close();
    }
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await expect(page.getByText(/HP 26\/30/)).toBeVisible();
      await page.locator(".battle-enemy-trigger").hover();
      await expect(page.getByRole("tooltip")).toContainText("Next: Open-Wing Dust");
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop retains expedition unlocks after relaunch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-expedition-"));
  const launch = () =>
    electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    const app = await launch();
    try {
      const page = await app.firstWindow();
      await page.evaluate(() =>
        localStorage.setItem("dusk-and-dawn.expeditions.v1", JSON.stringify({ completed: ["test-run"] })),
      );
    } finally {
      await app.close();
    }
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Configure expedition" }).click();
      await expect(page.getByText(/Pool tier 2\/3/)).toBeVisible();
      await expect(page.getByRole("option", { name: /Nocturne/ })).toBeEnabled();
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop resumes an Oracle run with its passive and kit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-hero-"));
  const launch = () =>
    electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    const app = await launch();
    try {
      const page = await app.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: /^The Veiled Oracle/ }).click();
      await page.getByRole("button", { name: "Start new run" }).click();
      await expect(page.getByRole("img", { name: /^Library 5\. Scry\./ })).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
              .duskDesktop;
            const [raw] = await bridge.readSaveCandidates();
            return raw ? JSON.parse(raw).state.run.hero : null;
          }),
        )
        .toBe("veiled-oracle");
    } finally {
      await app.close();
    }
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 30/30" })).toBeVisible();
      await expect(page.getByRole("img", { name: /^Library 5\. Scry\./ })).toBeVisible();
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop resumes a Sunken Sanctuary choice and its opening mana", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-sanctuary-"));
  const initial = structuredClone(
    createRun(
      31,
      { id: "desktop-sanctuary", tier: 1, orientation: "light", relic: "none" },
      "oathless-seraph",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  initial.state.player.hp = 20;
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.event = "sanctuary";
  route.state.experiment!.lastEvent = "sanctuary";
  const launch = () =>
    electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    await mkdir(join(directory, "saves"), { recursive: true });
    await writeFile(join(directory, "saves", "save.json"), encodeRun(route));
    const app = await launch();
    try {
      const page = await app.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await page.getByRole("button", { name: "Event: heal 7 HP, start next fight with 2 mana" }).click();
      await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "27");
      await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", "2");
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
              .duskDesktop;
            const [raw] = await bridge.readSaveCandidates();
            return raw ? JSON.parse(raw).state.run.fight : null;
          }),
        )
        .toBe(1);
    } finally {
      await app.close();
    }
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "27");
      await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", "2");
      await page.getByRole("button", { name: /Discard .* Banished/ }).click();
      await page.getByRole("button", { name: "Deck 10", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Deck · 10" })).toBeVisible();
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop replay waits for the finished save and survives relaunch", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dusk-electron-replay-"));
  const initial = createRun(
    25,
    { id: "desktop-before-replay", tier: 2, orientation: "dark", relic: "ashen-seal" },
    "veiled-oracle",
  ).getSnapshot();
  const launch = () =>
    electron.launch({
      args: [".", `--user-data-dir=${directory}`],
      env: { ...process.env, DUSK_DEV_URL: "" },
    });
  try {
    await mkdir(join(directory, "saves"), { recursive: true });
    await writeFile(join(directory, "saves", "save.json"), encodeRun(initial));
    const app = await launch();
    let newId = "";
    try {
      const page = await app.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await page.getByRole("button", { name: "Concede" }).click();
      await page.getByRole("button", { name: "Play again" }).click();
      await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 30/30" })).toBeVisible();
      await expect(page.locator(".battle-card").first()).toContainText("dark");
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
              .duskDesktop;
            const [raw] = await bridge.readSaveCandidates();
            const run = raw ? JSON.parse(raw).state.run : null;
            return (
              run?.phase === "battle" && !!run.experiment?.id && run.experiment.id !== "desktop-before-replay"
            );
          }),
        )
        .toBe(true);
      const run = await page.evaluate(async () => {
        const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
          .duskDesktop;
        const [raw] = await bridge.readSaveCandidates();
        return JSON.parse(raw!).state.run;
      });
      expect(run).toMatchObject({
        phase: "battle",
        hero: "veiled-oracle",
        fight: 0,
        experiment: { orientation: "dark", relic: "ashen-seal" },
      });
      newId = run.experiment.id;
      expect(newId).toBeTruthy();
      expect(newId).not.toBe("desktop-before-replay");
    } finally {
      await app.close();
    }
    const reopened = await launch();
    try {
      const page = await reopened.firstWindow();
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 30/30" })).toBeVisible();
      await expect(page.locator(".battle-card").first()).toContainText("dark");
      const id = await page.evaluate(async () => {
        const bridge = (window as unknown as { duskDesktop: { readSaveCandidates(): Promise<string[]> } })
          .duskDesktop;
        const [raw] = await bridge.readSaveCandidates();
        return JSON.parse(raw!).state.run.experiment.id;
      });
      expect(id).toBe(newId);
    } finally {
      await reopened.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
