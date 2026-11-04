import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import { cards, createRun, getEnemy, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import { stateRng } from "../../src/lib/game/random-state";
import { encodeRun } from "../../src/lib/game/run-save";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const key = "dusk-and-dawn.collection.v1";
    if (!localStorage.getItem(key))
      localStorage.setItem(
        key,
        JSON.stringify([
          "card:Angel",
          "card:Vampire",
          "card:Seraph",
          "card:Fallen Seraph",
          "enemy:crowned-sun",
        ]),
      );
  });
});

test("collection cards fit above pagination at different window and game sizes", async ({ page }) => {
  for (const { width, height, gameSize } of [
    { width: 1280, height: 720, gameSize: 100 },
    { width: 1280, height: 720, gameSize: 120 },
    { width: 640, height: 480, gameSize: 120 },
    { width: 1920, height: 1080, gameSize: 120 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate((size) => {
      localStorage.setItem(
        "dusk-and-dawn.settings.v1",
        JSON.stringify({ gameSizePercent: size, reducedMotion: true }),
      );
    }, gameSize);
    await page.reload();
    await page.getByRole("button", { name: "Collection" }).click();
    for (const tab of ["Cards", "Enemies"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      const cards = page.locator(".game-card");
      const pagination = page.getByRole("navigation", { name: "Card pages" });
      await expect(pagination).toBeInViewport({ ratio: 1 });
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const row = [...document.querySelectorAll(".card-grid-row:first-child .game-card")].map((card) =>
              card.getBoundingClientRect(),
            );
            const back = document.querySelector('[aria-label="Back"]')!.getBoundingClientRect();
            const menu = document.querySelector('[aria-label="Open game menu"]')!.getBoundingClientRect();
            return Math.max(
              Math.abs(back.left - row[0]!.left),
              Math.abs(menu.right - row[row.length - 1]!.right),
            );
          }),
        )
        .toBeLessThan(1);
      const bounds = await page.evaluate(() => {
        const pagination = document.querySelector(".pagination")!.getBoundingClientRect();
        const cards = [...document.querySelectorAll(".game-card")].map((card) =>
          card.getBoundingClientRect(),
        );
        return {
          scrollHeight: document.documentElement.scrollHeight,
          tabsBottom: document.querySelector(".ui-tab-bar")!.getBoundingClientRect().bottom,
          top: Math.min(...cards.map((card) => card.top)),
          bottom: Math.max(...cards.map((card) => card.bottom)),
          paginationTop: pagination.top,
        };
      });
      expect(bounds.scrollHeight).toBeLessThanOrEqual(height);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.paginationTop);
      if (width === 1280 && gameSize === 100) {
        const box = (await cards.first().boundingBox())!;
        expect(box.width).toBeGreaterThan(tab === "Cards" ? 150 : 200);
        expect(bounds.top - bounds.tabsBottom).toBeGreaterThanOrEqual(23);
        expect(bounds.paginationTop - bounds.bottom).toBeGreaterThanOrEqual(19);
      }
    }
  }
});

test("card corners and inspection border widths follow Alchemy", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  const card = page.getByRole("img", { name: "Angel" });
  expect(await card.evaluate((element) => getComputedStyle(element).borderRadius)).toBe("30px");
  expect(await card.evaluate((element) => getComputedStyle(element).borderWidth)).toBe("1px");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await card.focus();
  const shine = card.locator(".shine-border rect");
  await expect(shine).toHaveCSS("stroke-width", "2px");
  await card.hover();
  await expect(shine).toHaveCSS("stroke-width", "3px");
});

test("browses both card shapes by hover or keyboard without click inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await page.getByRole("button", { name: "Collection" }).click();
  const card = page.getByRole("img", { name: "Angel" });
  await expect(page.locator(".card-grid-item p")).toHaveCount(0);
  await expect(page.locator(".screen-header .eyebrow")).toHaveCount(0);
  const portrait = (await card.boundingBox())!;
  expect(portrait.width / portrait.height).toBeCloseTo(3 / 4, 2);
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Gain 5 Ward.");
  await expect(card).toHaveAttribute("aria-describedby", (await tooltip.getAttribute("id"))!);
  await card.click();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).not.toHaveAttribute("aria-pressed");
  await page.mouse.move(10, 10);
  await expect(tooltip).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("img", { name: "Vampire" })).toBeFocused();
  await expect(tooltip).toContainText("Vampire");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("img", { name: "Seraph", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("img", { name: "Undiscovered card 9" })).toBeVisible();
  await expect(page.getByText("2 / 62")).toBeVisible();
  await page.getByRole("button", { name: "Enemies" }).click();
  const enemy = page.getByRole("img", { name: "Crowned Sun" });
  const landscape = (await enemy.boundingBox())!;
  expect(landscape.width / landscape.height).toBeCloseTo(4 / 3, 2);
  await expect(page.getByText("1 / 19")).toBeVisible();
  await page.getByRole("button", { name: "Cards" }).click();
  await expect(page.getByText("2 / 62")).toBeVisible();
  await expect(page.getByRole("img", { name: "Undiscovered card 9" })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("display and audio preferences persist and scale independently", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("slider", { name: "Music" }).fill("35");
  await page.getByRole("button", { name: "Display" }).click();
  await page.getByRole("slider", { name: "Game size" }).fill("120");
  await page.getByRole("slider", { name: "Tooltip size" }).fill("125");
  await page.getByRole("switch", { name: "Reduce motion" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
  expect(
    await page
      .locator(".options-screen")
      .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration)),
  ).toBeLessThan(0.001);
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Collection" }).click();
  const card = page.getByRole("img", { name: "Angel" });
  const width = (await card.boundingBox())!.width;
  await card.hover();
  const tooltipSize = await page
    .getByRole("tooltip")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(tooltipSize).toBeCloseTo(16 * 1.2 * 1.25, 1);
  await page.setViewportSize({ width: 1920, height: 1080 });
  // The smaller window caps card size to keep pagination in view; a larger
  // window can use the additional height as well as the normal UI scale.
  await expect.poll(async () => (await card.boundingBox())!.width / width).toBeGreaterThan(1.36);
  await page.reload();
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("button", { name: "Sound" }).click();
  await expect(page.getByRole("slider", { name: "Music" })).toHaveValue("35");
  await page.getByRole("button", { name: "Display" }).click();
  await expect(page.getByRole("slider", { name: "Game size" })).toHaveValue("120");
  await expect(page.getByRole("slider", { name: "Tooltip size" })).toHaveValue("125");
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toBeChecked();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("flips tooltips at the viewport edge and dismisses on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  const card = page.getByRole("img", { name: "Angel" });
  await card.evaluate((element) =>
    Object.assign(element.parentElement!.style, {
      width: `${element.getBoundingClientRect().width}px`,
      position: "fixed",
      top: "1px",
      left: "1px",
      zIndex: "2",
    }),
  );
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toHaveAttribute("data-side", /^(bottom|right)$/);
  const box = (await tooltip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(800);
  expect(box.y + box.height).toBeLessThanOrEqual(600);
  await page.mouse.wheel(0, 100);
  await expect(tooltip).toBeHidden();
  await expect(card).not.toHaveAttribute("aria-describedby");
});

test("browser fullscreen enters and exits through the display control", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  const toggle = page.getByRole("switch", { name: "Fullscreen" });
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
});

test("keyboard navigation restores focus and recovers an inspected card after grid resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Play" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Collection" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Collection" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.getByRole("img", { name: "Fallen Seraph" }).focus();
  const card = page.getByRole("img", { name: "Fallen Seraph" });
  await expect(card).toBeFocused();
  await page.locator(".card-grid-shell").evaluate((element) => {
    (element as HTMLElement).style.width = "150px";
  });
  await expect(page.getByText("2 / 248")).toBeVisible();
  await expect(card).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Fallen Seraph");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Collection" })).toBeFocused();
});

test("a rejected fullscreen request reports failure and remains windowed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () => Promise.reject(new Error("denied"));
  });
  const toggle = page.getByRole("switch", { name: "Fullscreen" });
  await toggle.click();
  await expect(page.getByText("Could not change display mode.")).toBeVisible();
  await expect(toggle).not.toBeChecked();
});

test("arrow navigation preserves slider controls and moves through switches", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  await page.keyboard.press("Tab");
  await page.getByRole("slider", { name: "Tooltip size" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider", { name: "Tooltip size" })).toHaveValue("105");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("switch", { name: "Fullscreen" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toBeFocused();
});

test("collection masks discoveries and drives shine, plasma and particles from keywords", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fill;
    (window as unknown as { particleColors: string[] }).particleColors = [];
    CanvasRenderingContext2D.prototype.fill = function (
      this: CanvasRenderingContext2D,
      ...args: Parameters<typeof original>
    ) {
      if (this.canvas.dataset.testid === "particle-canvas") {
        const colors = (window as unknown as { particleColors: string[] }).particleColors;
        if (typeof this.fillStyle === "string" && !colors.includes(this.fillStyle))
          colors.push(this.fillStyle);
      }
      return original.apply(this, args);
    } as typeof original;
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  const glow = page.locator(".ambient-background");
  const first = page.getByRole("img", { name: "Angel" });
  await first.hover();
  await expect(glow).toHaveAttribute("data-primary", "#8BCBFF");
  await expect(first.locator(".shine-border stop").first()).toHaveAttribute("stop-color", "#8BCBFF");
  await expect(first.locator(".shine-border stop").first()).toHaveCSS("animation-name", "border-color-shine");
  await expect(page.getByRole("tooltip").locator(".shine-text")).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { particleColors: string[] }).particleColors.includes("#8bcbff"),
      ),
    )
    .toBe(true);
  await page.getByRole("img", { name: "Vampire" }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#C7AEF1");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { particleColors: string[] }).particleColors.includes("#c7aef1"),
      ),
    )
    .toBe(true);
  await page.getByRole("img", { name: "Seraph", exact: true }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#F7D670");
  await expect(glow).toHaveAttribute("data-secondary", "#F7D670");
  await expect(page.getByRole("tooltip").locator(".shine-text")).toHaveCount(2);
  await page.getByRole("img", { name: "Fallen Seraph" }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#C7AEF1");
  const locked = page.getByRole("img", { name: "Undiscovered card 6" });
  await locked.hover();
  await expect(locked).toHaveAttribute("data-discovered", "false");
  await expect(locked.locator(".shine-border stop").first()).toHaveAttribute("stop-color", "#D8ABFF");
  await expect(page.getByRole("tooltip")).toContainText("Discover this entry to reveal its details.");
  await expect(page.getByRole("tooltip")).not.toContainText("Flip");
  await expect(glow).toHaveAttribute("data-keyword-glow", "rest");
  await locked.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("reduced motion and zero intensity keep background effects controlled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("switch", { name: "Reduce motion" }).check();
  await expect(page.getByTestId("particle-canvas")).toBeHidden();
  await expect(page.getByTestId("plasma-fallback")).toBeVisible();
  await page.getByRole("switch", { name: "Reduce motion" }).uncheck();
  await expect(page.getByTestId("particle-canvas")).toBeVisible();
  await expect(page.getByTestId("plasma-canvas")).toBeVisible();
  await page.getByRole("switch", { name: "Reduce motion" }).check();
  await page.getByRole("slider", { name: "Background glow" }).fill("0");
  await page.getByRole("slider", { name: "Background particles" }).fill("0");
  await expect(page.getByTestId("plasma-fallback")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("slider", { name: "Background glow" })).toHaveValue("0");
  await expect(page.getByRole("slider", { name: "Background particles" })).toHaveValue("0");
  await page.getByRole("switch", { name: "Reduce motion" }).uncheck();
  await expect(page.getByTestId("particle-canvas")).toBeHidden();
});

test("WebGL loss displays a static fallback", async ({ page }) => {
  await page.goto("/");
  const canvas = page.getByTestId("plasma-canvas");
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) =>
    element.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
  );
  await expect(page.getByTestId("plasma-fallback")).toBeVisible();
  await expect(canvas).toBeHidden();
  await canvas.evaluate((element) => element.dispatchEvent(new Event("webglcontextrestored")));
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId("plasma-fallback")).toHaveCount(0);
});

test("unavailable WebGL uses a keyword-colored static fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === "webgl") return null;
      return Reflect.apply(original, this, [contextId, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  await page.getByRole("img", { name: "Vampire" }).hover();
  const fallback = page.getByTestId("plasma-fallback");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("style", /rgb\(199, 174, 241\)/);
  await expect(page.getByTestId("plasma-canvas")).toBeHidden();
});

test("screen chrome menu preserves collection history and contains keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator(".intro .eyebrow")).toHaveCount(0);
  await page.getByRole("button", { name: "Collection" }).click();
  await expect(page.locator(".screen-header")).toContainText("Collection");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("2 / 62")).toBeVisible();
  const menuButton = page.getByRole("button", { name: "Open game menu" });
  await menuButton.click();
  const menu = page.getByRole("dialog", { name: "Game menu" });
  await expect(menu).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("button", { name: "Options" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await expect(menuButton).toBeFocused();
  await menuButton.click();
  await menu.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await expect(page.getByText("2 / 62")).toBeVisible();
  await page.getByRole("button", { name: "Open game menu" }).click();
  await menu.getByRole("button", { name: "Main Menu" }).click();
  await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
});

test("game menu dismisses on backdrop and centers after a resize", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  await page.getByRole("button", { name: "Open game menu" }).click();
  const menu = page.getByRole("dialog", { name: "Game menu" });
  await expect(menu).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(menu).toBeHidden();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(menu).toHaveClass(/game-menu--centered/);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("an unlocked expedition starts and resumes a varied opening encounter", async ({ page }) => {
  const config = { id: "selection", tier: 2, orientation: "light", relic: "none" } as const;
  const seed = Array.from({ length: 100 }, (_, i) => i).find(
    (value) => createRun(value, config, "oathless-seraph").getSnapshot().state.encounters![0] !== "fixture:0",
  )!;
  const state = createRun(seed, config, "oathless-seraph").getSnapshot().state;
  const enemyName = getEnemy(state).name;
  await page.addInitScript((value) => {
    Math.random = () => value / 0x100000000;
    localStorage.setItem("dusk-and-dawn.expeditions.v1", JSON.stringify({ completed: ["prior-expedition"] }));
  }, seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: enemyName, exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: `${enemyName} health` })).toHaveAttribute(
    "value",
    String(state.enemy.hp),
  );
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.encounters[0]),
    )
    .toBe(state.encounters![0]);
  await page.getByRole("button", { name: "End turn" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: enemyName, exact: true })).toBeVisible();
  await expect(page.getByText("A retained copy of the run was recovered.")).toHaveCount(0);
});

test("a player can inspect and play a card, then end the turn", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "End turn" })).toBeInViewport();
  const card = page.locator(".battle-card").first();
  await expect(card.locator("img")).toHaveJSProperty("complete", true);
  expect(await card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.locator(".battle-enemy-trigger").hover();
  await expect(page.getByRole("tooltip")).toContainText(
    /Current attack:.*Radiance damage before Ward and Reflect/,
  );
  await card.hover();
  await expect(page.getByRole("tooltip")).toContainText("Other face:");
  await card.click();
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Play / })).toHaveCount(0);
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
  await page.screenshot({ path: "/tmp/dusk-dawn-battle.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("a run can be resumed after reloading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText(/HP 26\/30/)).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const save = localStorage.getItem("dusk-and-dawn.save.v1");
        return save ? JSON.parse(save).state.run.player.hp : null;
      }),
    )
    .toBe(26);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect(page.getByText(/HP 26\/30/)).toBeVisible();
  await page.locator(".battle-enemy-trigger").hover();
  await expect(page.getByRole("tooltip")).toContainText("Next: Open-Wing Dust");
});

test("paid library inspection survives reload and resolves without leaking early", async ({ page }) => {
  const snapshot = structuredClone(createRun(44).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Walled City & Wilderness" },
    { id: "bottom", pair: "Sun & Moon" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
    { id: "three", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "dark", kept: false }];
  snapshot.state.zones.library = snapshot.state.deck
    .slice(1)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByLabel("Committed inspection")).toHaveCount(0);
  await page.getByRole("button", { name: /Wilderness dark/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Committed inspection")).toBeFocused();
  await expect(page.getByRole("button", { name: /^Discard / })).toBeDisabled();
  await expect(page.getByRole("button", { name: "End turn" })).toBeDisabled();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.pending?.cards.length,
      ),
    )
    .toBe(3);
  // The initialization hook is no longer needed; reload should use the persisted pending state.
  await page.evaluate(() =>
    sessionStorage.setItem("inspection-test", localStorage.getItem("dusk-and-dawn.save.v1")!),
  );
  await page.addInitScript(() => {
    const value = sessionStorage.getItem("inspection-test");
    if (value) localStorage.setItem("dusk-and-dawn.save.v1", value);
  });
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const panel = page.getByLabel("Committed inspection");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Confirm choice" })).toHaveCount(0);
  await panel.getByRole("button", { name: /^Flame —/ }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Flame light/ })).toBeVisible();
  await expect(page.getByText(/Mana 2\/3/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.zones.library.map(
          (card: { id: string }) => card.id,
        ),
      ),
    )
    .toEqual(["one", "two", "bottom"]);
});

test("plays a complete seeded run through the browser", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await page.getByRole("button", { name: "Start classic run" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  const encountered = new Set<string>();
  for (let step = 0; step < 300; step++) {
    const title = (await page.locator("#battle-title").innerText()).trim();
    if (title === "Victory") break;
    if (title === "Run ended") throw new Error(`Seeded browser run ended in defeat after ${step} decisions`);
    if (title === "Rewards") {
      const offers = page.locator(".battle-reward");
      if (await offers.count()) {
        await expect(offers.first().locator(".battle-reward-art img")).toHaveCount(2);
        for (const image of await offers.first().locator(".battle-reward-art img").all()) {
          await expect(image).toHaveJSProperty("complete", true);
          expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(
            0,
          );
        }
      }
      await page.getByRole("button", { name: "Skip reward" }).click();
      continue;
    }
    if (title === "A moment of rest") {
      await page.getByRole("button", { name: /^Heal \d+ HP$/ }).click();
      continue;
    }
    encountered.add(title);
    const player = page.locator(".battle-player");
    const enemy = page.locator(".battle-enemy");
    const hp = Number(await player.getAttribute("data-player-hp"));
    const mana = Number(await player.getAttribute("data-mana"));
    const ward = Number(await player.getAttribute("data-ward"));
    const burn = Number(await enemy.getAttribute("data-enemy-burn"));
    const curse = Number(await enemy.getAttribute("data-enemy-curse"));
    const priority: Record<string, number> = {
      Seraph: 21,
      Sun: 20,
      Vampire: 19,
      Wither: 18,
      Flame: burn < 3 ? 16 : 1,
      Angel: ward < 5 ? 12 : 2,
      Frost: curse < 2 ? 11 : 1,
      Key: 10,
      Feather: 10,
      Chain: curse < 2 ? 11 : 1,
      Moon: 9,
      Bloom: hp <= 24 ? 6 : 0,
    };
    const choices = page.locator(".battle-card");
    let best = -1,
      score = 0;
    for (let index = 0; index < (await choices.count()); index++) {
      const name = (await choices.nth(index).locator("strong").first().innerText()).trim();
      if ((priority[name] ?? 0) > score) {
        best = index;
        score = priority[name]!;
      }
    }
    if (!mana || best < 0) {
      await page.getByRole("button", { name: "End turn" }).click();
      continue;
    }
    await choices.nth(best).click();
  }
  await expect(page.getByRole("heading", { name: "Victory", exact: true })).toBeVisible();
  expect(encountered.size).toBe(5);
  expect(errors).toEqual([]);
});

test("encountered enemies remain discovered in the real collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]").includes(
          "enemy:radiant-moth",
        ),
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Collection" }).click();
  await page.getByRole("button", { name: "Enemies" }).click();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("img", { name: "Radiant Moth", exact: true })).toBeVisible();
  await page.getByRole("img", { name: "Radiant Moth", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toContainText("Open Wings");
});

test("recovers a retained run without replacing its backup", async ({ page }) => {
  const good = encodeRun(createRun(13).getSnapshot());
  const broken = JSON.parse(good);
  broken.state.run.player.hp = 999;
  await page.addInitScript(
    ({ good, bad }) => {
      localStorage.setItem("dusk-and-dawn.save.v1", bad);
      localStorage.setItem("dusk-and-dawn.save.v1.backup", good);
    },
    { good, bad: JSON.stringify(broken) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("A retained copy of the run was recovered.")).toBeVisible();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.player.hp),
    )
    .toBe(26);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1.backup"))).toBe(good);
});

test("automatically retrieves Memory's only eligible discard target", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck[0]!.pair = "Memory & Oblivion";
  snapshot.state.deck[1]!.pair = "Sun & Moon";
  const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
  snapshot.state.zones.hand = [fight[0]!];
  snapshot.state.zones.discard = [{ ...fight[1]!, face: "dark" }];
  snapshot.state.zones.library = fight.slice(2);
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const memory = page.getByRole("button", { name: /Memory light/ });
  await memory.hover();
  await expect(page.getByRole("tooltip")).toContainText("Automatic target: Moon.");
  await memory.click();
  await expect(page.getByText("Choose a card from your discard pile.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Moon dark/ })).toBeVisible();
});

for (const name of ["Memory", "Sacrifice"] as const) {
  test(`${name} asks only for a necessary target and plays on target activation`, async ({ page }) => {
    const snapshot = structuredClone(createRun(22).getSnapshot());
    snapshot.state.deck = [
      { id: "source", pair: name === "Memory" ? "Memory & Oblivion" : "Sacrifice & Self-Preservation" },
      { id: "one", pair: "Sun & Moon" },
      { id: "two", pair: "Angel & Vampire" },
    ];
    const [source, one, two] = snapshot.state.deck.map((card) => ({
      ...card,
      face: "light" as const,
      kept: false,
    }));
    snapshot.state.zones.hand = name === "Memory" ? [source!] : [source!, one!, two!];
    snapshot.state.zones.discard = name === "Memory" ? [one!, two!] : [];
    snapshot.state.zones.library = [];
    snapshot.state.zones.banished = [];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const sourceButton = page.getByRole("button", { name: new RegExp(`${name} light`) });
    await sourceButton.focus();
    await page.keyboard.press("Enter");
    const choice = page.getByLabel("Selected card");
    await expect(choice).toBeFocused();
    await expect(sourceButton).toBeDisabled();
    await expect(page.getByRole("button", { name: /^Discard / })).toBeDisabled();
    await expect(page.getByRole("button", { name: "End turn" })).toBeDisabled();
    await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
    const preview = choice.getByRole("button", { name: /^Angel —/ });
    await preview.hover();
    if (name === "Sacrifice") {
      for (const img of await choice.locator("img").all())
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    }
    const tip = (await page.getByRole("tooltip").boundingBox())!;
    const cancel = (await choice.getByRole("button", { name: "Cancel" }).boundingBox())!;
    expect(
      tip.y + tip.height <= cancel.y ||
        cancel.y + cancel.height <= tip.y ||
        tip.x + tip.width <= cancel.x ||
        cancel.x + cancel.width <= tip.x,
    ).toBe(true);
    await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: `Play ${name}` })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(choice).toHaveCount(0);
    await expect(sourceButton).toBeFocused();
    await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
    await sourceButton.focus();
    await page.keyboard.press("Enter");
    await choice.getByRole("button", { name: /^Angel —/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
    await expect(choice).toHaveCount(0);
    if (name === "Memory") await expect(page.getByRole("button", { name: /Angel light/ })).toBeVisible();
    else await expect(page.getByRole("button", { name: /Angel light/ })).toHaveCount(0);
    await expect(page.locator(".battle-card:focus")).toHaveCount(1);
  });
}

test("keyboard activation directly plays an ordinary card and keeps focus in the hand", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  const card = page.locator(".battle-card").first();
  await page.locator(".battle-enemy-trigger").hover();
  await page.keyboard.press("Tab");
  await card.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
  await expect(page.locator(".battle-card:focus")).toHaveCount(1);
});

test("a card rejected for lack of mana remains in hand", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.mana = 0;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const cards = page.locator(".battle-card");
  const count = await cards.count();
  await expect(cards.first()).toHaveAttribute("aria-disabled", "true");
  await cards.first().hover();
  await expect(page.getByRole("tooltip")).toContainText("1 mana");
  const box = (await cards.first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await cards.first().focus();
  await page.keyboard.press("Enter");
  await expect(cards).toHaveCount(count);
  await expect(page.getByText("Mana 0/3", { exact: false })).toBeVisible();
});

test("previews when Water Clock cannot Keep itself after filling the hand", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck[0]!.pair = "Sundial & Water Clock";
  const fight = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
  snapshot.state.zones.hand = [{ ...fight[0]!, face: "dark" }, ...fight.slice(1, 8)];
  snapshot.state.zones.library = fight.slice(8);
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const waterClock = page.getByRole("button", { name: /Water Clock dark/ });
  await waterClock.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Drawing will fill your hand, so this card cannot return to it with Keep.",
  );
  await waterClock.click();
  await expect(page.getByRole("button", { name: /Water Clock dark/ })).toHaveCount(0);
  await expect(page.locator(".battle-card")).toHaveCount(8);
});

test("battle art remains full-bleed and combat text stays readable at common sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  const card = page.locator(".battle-card").first();
  const dimensions = await card.evaluate((element) => {
    const card = element as HTMLElement;
    const image = element.querySelector("img")!;
    const cardBox = card.getBoundingClientRect();
    const actionsBox = document.querySelector(".battle-actions")!.getBoundingClientRect();
    return {
      cardBox: { width: card.offsetWidth, height: card.offsetHeight },
      imageBox: { width: image.offsetWidth, height: image.offsetHeight },
      overlapsActions:
        cardBox.right > actionsBox.left &&
        cardBox.left < actionsBox.right &&
        cardBox.bottom > actionsBox.top &&
        cardBox.top < actionsBox.bottom,
    };
  });
  expect(dimensions.imageBox.width).toBeGreaterThan(dimensions.cardBox.width - 3);
  expect(dimensions.imageBox.height).toBeGreaterThan(dimensions.cardBox.height - 3);
  expect(dimensions.cardBox.width / dimensions.cardBox.height).toBeCloseTo(3 / 4, 1);
  expect(dimensions.overlapsActions).toBe(false);
  const enemyArt = await page.locator(".battle-enemy-art").boundingBox();
  expect(enemyArt!.width / enemyArt!.height).toBeCloseTo(4 / 3, 1);
  await page.setViewportSize({ width: 800, height: 600 });
  const fontSize = await page
    .locator(".battle-enemy")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(14);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThanOrEqual(14);
  await card.click();
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
});

test("battle actions stay usable on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("button", { name: "End turn" })).toBeInViewport();
  await expect(page.getByLabel(/^Library /)).toBeInViewport({ ratio: 1 });
  await expect(page.getByLabel(/^Discard /)).toBeInViewport({ ratio: 1 });
  const hand = (await page.locator(".battle-hand").boundingBox())!;
  const resource = (await page.locator(".battle-resource--health > p").first().boundingBox())!;
  expect(hand.y + hand.height).toBeLessThan(resource.y);
  await page.locator(".battle-card").first().click();
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "End turn" })).toBeInViewport();
});

test("expedition event survives reload and unlocks the dark start for a future run", async ({ page }) => {
  const snapshot = structuredClone(
    createRun(31, { id: "browser-expedition", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const legacy = structuredClone(game.getSnapshot());
  delete legacy.state.experiment!.route!.event;
  delete legacy.state.experiment!.lastEvent;
  const route = legacy.state.experiment!.route!;
  const saved = encodeRun(legacy);
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  const event = page.getByRole("button", { name: /^Event: lose 4 HP/ });
  await expect(page.locator(".battle-route-choice img")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.getByRole("button", { name: /^Combat:/ }).hover();
  const tip = (await page.getByRole("tooltip").boundingBox())!;
  const nextArt = (await page
    .getByRole("button", { name: /^Rest:/ })
    .locator("img")
    .boundingBox())!;
  expect(tip.y + tip.height).toBeLessThanOrEqual(nextArt.y);
  await event.hover();
  await expect(page.getByRole("tooltip")).toContainText(route.pair.split(" & ")[0]!);
  await event.click();
  await expect(page.getByText(/HP 26\/30/)).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.fight,
      ),
    )
    .toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByText(/HP 26\/30/)).toBeVisible();
  await page.getByRole("button", { name: "Concede" }).click();
  await expect(page.getByRole("heading", { name: "Run ended" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.expeditions.v1") || "{}")),
    )
    .toEqual({ completed: ["browser-expedition"] });
  await expect(
    page.getByRole("status").filter({ hasText: "Expedition pool · tier 2/3 · Nocturne unlocked" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View deck" }).click();
  const deck = page.getByRole("dialog", { name: /^Deck/ });
  await expect(deck).toBeVisible();
  await expect(deck.getByLabel(new RegExp(route.pair.split(" & ")[0]!))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(deck).toBeHidden();
  await expect(page.getByRole("button", { name: "View deck" })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByText("Expedition pool · tier 2/3 · Nocturne unlocked")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.expeditions.v1") || "{}").completed),
    )
    .toEqual(["browser-expedition"]);
  await page.getByRole("button", { name: "Return to main menu" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await expect(page.getByText(/Pool tier 2\/3/)).toBeVisible();
  await page.getByLabel("Starting orientation").selectOption("dark");
  await page.getByLabel("Run relic").selectOption("cracked-vessel");
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByText(/HP 24\/24/)).toBeVisible();
  await expect(page.locator(".battle-card").first()).toContainText("dark");
});

for (const event of [
  { id: "blood", label: "lose 4 HP", cost: "Lose 4 HP.", mana: "3", hp: "26" },
  {
    id: "thorns",
    label: "start next fight with 4 Poison",
    cost: "Start the next fight with 4 Poison.",
    mana: "3",
    hp: "30",
  },
  {
    id: "lantern",
    label: "start next fight with 2 mana",
    cost: "Start the next fight with 2 mana.",
    mana: "2",
    hp: "30",
  },
] as const) {
  test(`expedition ${event.id} event previews its cost and survives reload`, async ({ page }) => {
    const snapshot = structuredClone(
      createRun(31, {
        id: `browser-${event.id}`,
        tier: 1,
        orientation: "light",
        relic: "none",
      }).getSnapshot(),
    );
    snapshot.state.phase = "reward";
    snapshot.state.offers = [];
    const game = restoreSession(snapshot, runHandler);
    game.dispatch({ type: "reward", pair: null });
    const route = structuredClone(game.getSnapshot());
    route.state.experiment!.route!.event = event.id;
    route.state.experiment!.lastEvent = event.id;
    const pair = route.state.experiment!.route!.pair;
    await page.addInitScript((data) => {
      if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
    }, encodeRun(route));
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const choice = page.getByRole("button", { name: `Event: ${event.label}, add ${pair}` });
    await choice.hover();
    await expect(page.getByRole("tooltip")).toContainText(event.cost);
    await page.reload();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await page.getByRole("button", { name: `Event: ${event.label}, add ${pair}` }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", event.hp);
    await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", event.mana);
    if (event.id === "thorns")
      await expect(page.getByRole("button", { name: "Player status: poison 4" })).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.fight,
        ),
      )
      .toBe(1);
    await page.reload();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", event.mana);
    if (event.id === "thorns")
      await expect(page.getByRole("button", { name: "Player status: poison 4" })).toBeVisible();
    await page.getByRole("button", { name: /^Discard / }).click();
    await page.getByRole("button", { name: /^Deck / }).click();
    await expect(page.getByRole("dialog").getByLabel(new RegExp(pair.split(" & ")[0]!))).toBeVisible();
  });
}

test("an unaffordable Blood Bargain remains inspectable by keyboard", async ({ page }) => {
  const initial = structuredClone(
    createRun(31, { id: "low-health-event", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.player.hp = 4;
  route.state.experiment!.route!.event = "blood";
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), encodeRun(route));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const choice = page.getByRole("button", { name: /^Event: lose 4 HP/ });
  await expect(choice).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Tab");
  await choice.focus();
  await expect(page.getByRole("tooltip", { name: /^Blood Bargain/ })).toContainText("Lose 4 HP.");
  await choice.press("Enter");
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
});

test("an expedition recap does not claim a progress unlock when storage is unavailable", async ({ page }) => {
  const snapshot = structuredClone(
    createRun(31, {
      id: "failed-progress-write",
      tier: 1,
      orientation: "light",
      relic: "none",
    }).getSnapshot(),
  );
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "reward", pair: null });
  game.dispatch({ type: "route", choice: "rest" });
  const saved = encodeRun(game.getSnapshot());
  await page.addInitScript((data) => {
    localStorage.setItem("dusk-and-dawn.save.v1", data);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "dusk-and-dawn.expeditions.v1") throw new Error("storage full");
      return original.call(this, key, value);
    };
  }, saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Concede" }).click();
  await expect(page.getByRole("heading", { name: "Run ended" })).toBeVisible();
  await expect(page.getByText(/Expedition pool/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveText("Expedition progress could not be saved.");
  await page.getByRole("button", { name: "View deck" }).click();
  await expect(page.getByRole("dialog", { name: /^Deck/ })).toBeVisible();
});

test("plays a full branching expedition through the browser", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = localStorage.getItem("dusk-and-dawn.save.v1");
        return saved && JSON.parse(saved).state.run.experiment;
      }),
    )
    .toMatchObject({ tier: 1, orientation: "light", relic: "none" });
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  const encountered = new Set<string>();
  let branches = 0;
  for (let step = 0; step < 300; step++) {
    const title = (await page.locator("#battle-title").innerText()).trim();
    if (title === "Victory") break;
    if (title === "Run ended") throw new Error(`Seeded browser run ended in defeat after ${step} decisions`);
    if (title === "Choose a path") {
      branches++;
      await page.getByRole("button", { name: branches === 1 ? /^Combat:/ : /^Rest: heal \d+/ }).click();
      continue;
    }
    if (title === "Rewards") {
      const offers = page.locator(".battle-reward");
      if ((await offers.count()) === 4) {
        const boxes = await Promise.all((await offers.all()).map((offer) => offer.boundingBox()));
        expect(
          Math.max(...boxes.map((box) => box!.y)) - Math.min(...boxes.map((box) => box!.y)),
        ).toBeLessThan(2);
      }
      await page.getByRole("button", { name: "Skip reward" }).click();
      continue;
    }
    if (title === "A moment of rest") {
      await page.getByRole("button", { name: /^Heal \d+ HP$/ }).click();
      continue;
    }
    encountered.add(title);
    const player = page.locator(".battle-player");
    const enemy = page.locator(".battle-enemy");
    const hp = Number(await player.getAttribute("data-player-hp"));
    const mana = Number(await player.getAttribute("data-mana"));
    const ward = Number(await player.getAttribute("data-ward"));
    const burn = Number(await enemy.getAttribute("data-enemy-burn"));
    const curse = Number(await enemy.getAttribute("data-enemy-curse"));
    const priority: Record<string, number> = {
      Seraph: 21,
      Sun: 20,
      Vampire: 19,
      Wither: 18,
      Flame: burn < 3 ? 16 : 1,
      Angel: ward < 5 ? 12 : 2,
      Frost: curse < 2 ? 11 : 1,
      Key: 10,
      Feather: 10,
      Chain: curse < 2 ? 11 : 1,
      Moon: 9,
      Bloom: hp <= 24 ? 6 : 0,
    };
    const choices = page.locator(".battle-card");
    let best = -1,
      score = 0;
    for (let index = 0; index < (await choices.count()); index++) {
      const name = (await choices.nth(index).locator("strong").first().innerText()).trim();
      if ((priority[name] ?? 0) > score) {
        best = index;
        score = priority[name]!;
      }
    }
    if (!mana || best < 0) {
      await page.getByRole("button", { name: "End turn" }).click();
      continue;
    }
    await choices.nth(best).click();
  }
  await expect(page.getByRole("heading", { name: "Victory", exact: true })).toBeVisible();
  expect(encountered.size).toBe(6);
  expect(branches).toBe(2);
  expect(errors).toEqual([]);
});

test("inspects battle cards on hover and keyboard focus without selecting them", async ({ page }) => {
  const seed = Array.from({ length: 100 }, (_, index) => index).find((value) =>
    createRun(value, { id: "inspection", tier: 1, orientation: "light", relic: "none" }, "oathless-seraph")
      .getSnapshot()
      .state.zones.hand.some((card) => card.pair === "Angel & Vampire"),
  )!;
  await page.addInitScript((value) => {
    Math.random = () => value / 0x100000000;
  }, seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("progressbar", { name: "Radiant Moth health" })).toHaveAttribute("value", "18");
  await page.locator(".battle-enemy-trigger").hover();
  await expect(page.getByRole("tooltip")).toContainText("Deal 4 Radiance damage.");
  const card = page.locator(".battle-card").filter({ hasText: "Angel" }).first();
  await card.hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Absorbs damage");
  await expect(tip).toContainText("Other face:");
  await expect(tip).toContainText("Vampire");
  const layer = await page
    .locator("#tooltip-root")
    .evaluate((element) => Number(getComputedStyle(element).zIndex));
  expect(layer).toBeGreaterThan(10);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Play Angel/ })).toHaveCount(0);
  await page.mouse.move(5, 5);
  await expect(tip).toBeHidden();
  await page.keyboard.press("Tab");
  await card.focus();
  await expect(tip).toBeVisible();
  await expect(card).toHaveAttribute("aria-describedby", (await tip.getAttribute("id"))!);
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("hand inspection keeps the enemy and actions clear when desktop space permits", async ({ page }) => {
  const seed = Array.from({ length: 100 }, (_, index) => index).find(
    (value) =>
      createRun(
        value,
        { id: "placement", tier: 1, orientation: "light", relic: "none" },
        "oathless-seraph",
      ).getSnapshot().state.zones.hand[2]?.pair === "Key & Lock",
  )!;
  await page.addInitScript((value) => {
    Math.random = () => value / 0x100000000;
  }, seed);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  const card = page.locator(".battle-card").nth(2);
  const tip = page.getByRole("tooltip");
  const clearBoard = async () => {
    const boxes = await Promise.all(
      [
        tip,
        page.locator(".battle-enemy"),
        page.locator(".battle-hand-stage"),
        page.locator(".battle-actions"),
      ].map((item) => item.boundingBox()),
    );
    const [panel, ...protectedAreas] = boxes;
    if (!panel || protectedAreas.some((area) => !area)) return null;
    return protectedAreas.map(
      (area) =>
        panel.x < area!.x + area!.width &&
        panel.x + panel.width > area!.x &&
        panel.y < area!.y + area!.height &&
        panel.y + panel.height > area!.y,
    );
  };
  await card.hover();
  await expect(tip).toContainText("Flip preview:");
  await expect(tip).toHaveAttribute("data-visible", "true");
  await expect.poll(clearBoard).toEqual([false, false, false]);
  await page.mouse.move(5, 5);
  await page.keyboard.press("Tab");
  await card.focus();
  await expect(tip).toBeVisible();
  await expect.poll(clearBoard).toEqual([false, false, false]);
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect.poll(clearBoard).toEqual([false, false, false]);
  await page.setViewportSize({ width: 320, height: 480 });
  await expect(tip).toBeInViewport({ ratio: 1 });
  await expect(tip).toContainText("Flip preview:");
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Mana 2\/3/)).toBeVisible();
});

test("a completed detour remains recorded across reward and battle reloads", async ({ page }) => {
  const initial = structuredClone(
    createRun(45, { id: "detour-memory", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  let game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const detour = game.getSnapshot().state.experiment!.route!.enemy;
  game.dispatch({ type: "route", choice: "combat" });
  const battle = structuredClone(game.getSnapshot());
  battle.state.enemy.hp = 1;
  const sun = [...battle.state.zones.hand, ...battle.state.zones.library].find(
    (card) => card.pair === "Sun & Moon",
  )!;
  if (!battle.state.zones.hand.some((card) => card.id === sun.id)) {
    battle.state.zones.library = battle.state.zones.library.filter((card) => card.id !== sun.id);
    battle.state.zones.hand.push(sun);
  }
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(battle));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Sun light/ }).click();
  await expect(page.getByRole("heading", { name: "Rewards" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Rewards" })).toBeVisible();
  await page.getByRole("button", { name: "Skip reward" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.experiment.lastDetour,
      ),
    )
    .toBe(detour);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("A retained copy of the run was recovered.")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator("#battle-title")).not.toHaveText("Rewards");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.experiment.lastDetour,
    ),
  ).toBe(detour);
});

test("a conceded detour reloads as a defeat instead of recovering the previous battle", async ({ page }) => {
  const setup = structuredClone(
    createRun(71, { id: "detour-save", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  setup.state.phase = "reward";
  setup.state.offers = [];
  const game = restoreSession(setup, runHandler);
  game.dispatch({ type: "reward", pair: null });
  game.dispatch({ type: "route", choice: "combat" });
  const initial = encodeRun(game.getSnapshot());
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, initial);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Concede" }).click();
  await expect(page.getByRole("heading", { name: "Run ended" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.phase,
      ),
    )
    .toBe("defeat");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("A retained copy of the run was recovered.")).toHaveCount(0);
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Run ended" })).toBeVisible();
  await expect(page.getByText(/Expedition pool/)).toHaveCount(0);
  await expect(page.getByText("Journey 1/5 · Deck 10")).toBeVisible();
});

test("victory recap replays the same expedition setup and saves the new run", async ({ page }) => {
  const snapshot = structuredClone(
    createRun(
      17,
      { id: "finished-expedition", tier: 2, orientation: "dark", relic: "ashen-seal" },
      "thorn-witch",
    ).getSnapshot(),
  );
  snapshot.state.phase = "victory";
  snapshot.state.fight = 4;
  snapshot.state.encounters![4] = "fixture:4";
  snapshot.state.action = 0;
  snapshot.state.player.hp = 13;
  snapshot.state.message = "Hollow King falls.";
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
    if (!localStorage.getItem("dusk-and-dawn.expeditions.v1"))
      localStorage.setItem(
        "dusk-and-dawn.expeditions.v1",
        JSON.stringify({ completed: ["previous-expedition"] }),
      );
  }, encodeRun(snapshot));
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Victory", exact: true })).toBeVisible();
  await expect(page.locator(".battle-ending p").first()).toContainText("Journey 5/5 · Deck 10 · HP 13/30");
  const health = page.getByRole("button", { name: "The Thorn Witch, HP 13/30" });
  await health.hover();
  await expect(page.getByRole("tooltip")).toContainText("Ashen Seal");
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.expeditions.v1") || "{}")),
    )
    .toEqual({
      completed: ["previous-expedition", "finished-expedition"],
    });
  for (const name of ["Play again", "View deck", "Return to main menu"]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeInViewport({ ratio: 1 });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const image = page.locator(".battle-ending img");
  const centerOffset = await image.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return Math.abs((box.left + box.right) / 2 - innerWidth / 2);
  });
  expect(centerOffset).toBeLessThan(1);
  const replay = page.getByRole("button", { name: "Play again" });
  await replay.focus();
  await page.keyboard.press("Enter");
  const opening = page.locator("#battle-title");
  await expect(opening).toBeFocused();
  const openingName = await opening.innerText();
  expect(["Radiant Moth", "The Ink Jackrabbit", "The Blue Jackal", "The Brass Cicada"]).toContain(
    openingName,
  );
  await expect(page.getByRole("button", { name: "The Thorn Witch, HP 30/30" })).toBeVisible();
  await expect(page.locator(".battle-card")).toHaveCount(5);
  await expect(page.locator(".battle-card").first()).toContainText("dark");
  const savedRun = async () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run);
  await expect.poll(async () => (await savedRun())?.phase).toBe("battle");
  const restarted = await savedRun();
  expect(restarted.hero).toBe("thorn-witch");
  expect(restarted.fight).toBe(0);
  expect(restarted.experiment).toMatchObject({ tier: 3, orientation: "dark", relic: "ashen-seal" });
  expect(restarted.experiment.id).not.toBe("finished-expedition");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: openingName, exact: true })).toBeVisible();
  expect((await savedRun()).experiment.id).toBe(restarted.experiment.id);
  expect(
    JSON.parse((await page.evaluate(() => localStorage.getItem("dusk-and-dawn.expeditions.v1")))!).completed,
  ).toEqual(["previous-expedition", "finished-expedition"]);
});

test("expanded replay label remains usable on a compact ending", async ({ page }) => {
  const snapshot = structuredClone(createRun(21).getSnapshot());
  snapshot.state.phase = "defeat";
  snapshot.state.player.hp = 0;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.evaluate(async () => {
    const modulePath = "/src/lib/localization/index.ts";
    const { localization } = await import(/* @vite-ignore */ modulePath);
    await localization.changeLanguage("en-XA");
  });
  const replay = page.getByRole("button", { name: "[Plaaay agaaain]", exact: true });
  await expect(replay).toBeInViewport({ ratio: 1 });
  expect((await replay.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await replay.click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
});

for (const scenario of [
  { name: "first fight", fight: 0, detour: false, hp: 0, completed: 0 },
  { name: "first detour", fight: 0, detour: true, hp: 0, completed: 1 },
  { name: "second detour", fight: 2, detour: true, hp: 12, completed: 3 },
  { name: "boss", fight: 4, detour: false, hp: 0, completed: 4 },
] as const) {
  test(`ending recap counts completed scheduled fights after ${scenario.name}`, async ({ page }) => {
    const snapshot = structuredClone(
      createRun(11, {
        id: `ending-${scenario.name}`,
        tier: 1,
        orientation: "light",
        relic: "none",
      }).getSnapshot(),
    );
    snapshot.state.phase = "defeat";
    snapshot.state.fight = scenario.fight;
    snapshot.state.action = 0;
    snapshot.state.player.hp = scenario.hp;
    snapshot.state.message = scenario.hp ? "Run conceded." : "You fell.";
    if (scenario.detour)
      snapshot.state.experiment!.route = { active: true, enemy: "the-cobweb-admiral", pair: "Sun & Moon" };
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await expect(page.locator(".battle-ending p").first()).toContainText(
      `Journey ${scenario.completed}/5 · Deck 10 · HP ${scenario.hp}/30`,
    );
  });
}

test("replaying a legacy run keeps its original run mode", async ({ page }) => {
  const snapshot = structuredClone(createRun(21).getSnapshot());
  snapshot.state.phase = "defeat";
  snapshot.state.player.hp = 0;
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(snapshot));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.phase,
      ),
    )
    .toBe("battle");
  const run = await page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run);
  expect(run.hero).toBeUndefined();
  expect(run.experiment).toBeUndefined();
  expect(run.deck).toHaveLength(10);
});

test("enemy pattern inspection preserves repeated actions without console errors", async ({ page }) => {
  const snapshot = structuredClone(createRun(14).getSnapshot());
  snapshot.state.encounters![0] = "the-cellar-duchess";
  const saved = encodeRun(snapshot);
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.locator(".battle-enemy-trigger").hover();
  const pattern = (await page.getByRole("tooltip").innerText()).split("Pattern:")[1]!;
  expect(pattern.match(/Bitter Goblet/g)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test("Fogbound Weaver previews retained cards and preserves their order during a browser turn", async ({
  page,
}) => {
  const setup = structuredClone(createRun(42).getSnapshot());
  setup.random.value = 0;
  setup.state.encounters![0] = "the-fogbound-weaver";
  setup.state.action = 1;
  setup.state.enemy.hp = 28;
  setup.state.enemy.maxHp = 28;
  setup.state.player.nextDrawPenalty = 5;
  setup.state.zones.hand.forEach((card) => {
    card.kept = true;
  });
  const original = setup.state.zones.hand.slice();
  const pool = original.slice();
  const random = stateRng({ ...setup.random });
  const chosen = new Set(
    Array.from({ length: 2 }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]!.id),
  );
  const ordered = original.filter((card) => chosen.has(card.id)).map((card) => card.id);
  const save = encodeRun(setup);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), save);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "The Fogbound Weaver", exact: true })).toBeVisible();
  await page.locator(".battle-enemy-trigger").hover();
  await expect(page.getByRole("tooltip")).toContainText("Held-card hazard pool if you end turn now:");
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText(/HP 26\/30/)).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}");
        const library = data.state?.run?.zones?.library;
        return library
          ?.slice(-2)
          .reverse()
          .map((card: { id: string }) => card.id);
      }),
    )
    .toEqual(ordered);
});

test("Funnel previews and draws the first card in the visible hand order", async ({ page }) => {
  const snapshot = structuredClone(createRun(9).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Sieve & Funnel" },
    { id: "first", pair: "Sun & Moon" },
    { id: "second", pair: "Angel & Vampire" },
    { id: "old", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [
    { ...snapshot.state.deck[0]!, face: "dark", kept: false },
    { ...snapshot.state.deck[1]!, face: "dark", kept: true },
    { ...snapshot.state.deck[2]!, face: "light", kept: false },
  ];
  snapshot.state.zones.library = [{ ...snapshot.state.deck[3]!, face: "light", kept: false }];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  const save = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), save);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const funnel = page.getByRole("button", { name: /Funnel dark/ });
  await funnel.hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "Hand to library top (draw order within moved cards): Moon, Angel",
  );
  await funnel.click();
  await expect(page.locator(".battle-card")).toHaveCount(1);
  await expect(page.locator(".battle-card").first()).toContainText("Moon");
  await expect(page.locator(".battle-card").first()).not.toContainText("Kept");
});

test("preloads both faces of the deck and reports actual combat damage briefly", async ({ page }) => {
  const requested = new Set<string>();
  page.on("request", (request) => requested.add(new URL(request.url()).pathname));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect.poll(() => requested.has("/assets/card-fallen-seraph.webp")).toBe(true);
  await expect.poll(() => requested.has("/assets/card-vampire.webp")).toBe(true);
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByRole("status")).toContainText("You −4 HP");
  await expect(page.getByRole("status")).toBeEmpty({ timeout: 5000 });
});

test("touch hold inspects a battle card without playing it; a tap plays it", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Start expedition" }).tap();
  const card = page.locator(".battle-card").first();
  const box = (await card.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(600);
  await expect(page.getByRole("tooltip")).toContainText("1 mana");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await card.tap();
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
  await context.close();
});

test("reports the enemy action when damage and healing cancel out", async ({ page }) => {
  const snapshot = structuredClone(createRun(42).getSnapshot());
  snapshot.state.encounters![0] = "mourning-tree";
  snapshot.state.enemy.maxHp = 36;
  snapshot.state.enemy.hp = 30;
  snapshot.state.enemy.burn = 3;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.locator(".battle-enemy h2")).toContainText("30/36");
  await expect(page.getByRole("status")).toContainText("Draw from the Earth: Heal 3 HP.");
});

for (const handSize of [1, 2, 3, 5, 8]) {
  test(`compact battle controls avoid a ${handSize}-card hand`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const snapshot = structuredClone(createRun(42).getSnapshot());
    const deck = snapshot.state.deck.map((card) => ({ ...card, face: "light" as const, kept: false }));
    snapshot.state.zones.hand = deck.slice(0, handSize);
    snapshot.state.zones.library = deck.slice(handSize);
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const controls = (await page.locator(".battle-actions").boundingBox())!;
    for (const card of await page.locator(".battle-card").all()) {
      const box = (await card.boundingBox())!;
      const intersects =
        box.x < controls.x + controls.width &&
        box.x + box.width > controls.x &&
        box.y < controls.y + controls.height &&
        box.y + box.height > controls.y;
      expect(intersects).toBe(false);
    }
  });
}

test("rest previews both faces and heals without changing the deck", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.phase = "rest";
  snapshot.state.fight = 1;
  snapshot.state.player.hp = 19;
  const initialDeck = snapshot.state.deck.length;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const card = page.getByRole("button", { name: /^Remove Angel & Vampire/ }).first();
  await expect(card.locator("img")).toHaveCount(2);
  await card.hover();
  await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
  await expect(page.getByRole("tooltip")).toContainText("Leech");
  await expect(page.getByText("HP 19/30")).toBeVisible();
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
  await page.getByRole("button", { name: /^Heal \d+ HP$/ }).click();
  await expect(page.getByText(/HP 25\/30/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck.length),
    )
    .toBe(initialDeck);
});

test("Spare Thread removal restores keyboard focus and survives a reload", async ({ page }) => {
  const snapshot = structuredClone(
    createRun(22, { id: "rest-test", tier: 1, orientation: "light", relic: "spare-thread" }).getSnapshot(),
  );
  snapshot.state.phase = "rest";
  snapshot.state.fight = 1;
  const firstId = snapshot.state.deck[0]!.id;
  const initialDeck = snapshot.state.deck.length;
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(snapshot));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const first = page.locator(".battle-rest-card").first();
  await page.mouse.move(5, 5);
  await page.keyboard.press("Tab");
  await first.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  const second = page.locator(".battle-rest-card").nth(2);
  await second.hover();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await page.mouse.move(5, 5);
  await page.keyboard.press("Tab");
  await first.focus();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Remove another pair" })).toBeVisible();
  await expect(page.locator(".battle-rest-card:focus")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck.length),
    )
    .toBe(initialDeck - 1);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Remove another pair" })).toBeVisible();
  const restored = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck as { id: string }[],
  );
  expect(restored.some((card) => card.id === firstId)).toBe(false);
  await page.locator(".battle-rest-card").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#battle-title")).toBeFocused();
  await expect(page.getByRole("heading", { name: "A moment of rest" })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck.length),
    )
    .toBe(initialDeck - 2);
});

test("expedition orientation artwork follows the selected unlocked face", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("dusk-and-dawn.expeditions.v1", JSON.stringify({ completed: ["past-run"] })),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  const artwork = page.locator(".battle-expedition__art");
  await expect(artwork).toHaveAttribute("data-orientation", "light");
  await expect(artwork.locator("img")).toHaveCount(2);
  await page.getByLabel("Starting orientation").selectOption("dark");
  await expect(artwork).toHaveAttribute("data-orientation", "dark");
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
  await page.getByLabel("Run relic").selectOption("cracked-vessel");
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByText(/HP 24\/24/)).toBeVisible();
  await expect(page.locator(".battle-card").first()).toContainText("dark");
});

test("touch can inspect a rest pair without removing it, then tap to remove", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.phase = "rest";
  snapshot.state.fight = 1;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  const cdp = await context.newCDPSession(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  const card = page.locator(".battle-rest-card").first();
  const box = (await card.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(600);
  await expect(page.getByRole("tooltip")).toContainText("Angel");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("heading", { name: "A moment of rest" })).toBeVisible();
  await expect(page.locator(".battle-rest-card")).toHaveCount(snapshot.state.deck.length);
  await card.tap();
  await expect(page.getByRole("heading", { name: "A moment of rest" })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck.length),
    )
    .toBe(snapshot.state.deck.length - 1);
  await context.close();
});

test("expedition selectors remain visible on a phone-sized window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await expect(page.getByLabel("Starting orientation")).toBeInViewport({ ratio: 1 });
  await expect(page.getByLabel("Run relic")).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("button", { name: "Start expedition" })).toBeInViewport({ ratio: 1 });
});

test("ordered inspection permits revisions and preserves the chosen draw order", async ({ page }) => {
  const snapshot = structuredClone(createRun(44).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Cartographer & Lost Wanderer" },
    { id: "bottom", pair: "Sun & Moon" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
    { id: "three", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = snapshot.state.deck
    .slice(1)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Cartographer light/ }).click();
  const panel = page.getByLabel("Committed inspection");
  await expect(panel.locator(".battle-inspection-card img")).toHaveCount(3);
  const sun = panel.getByRole("button", { name: /^Sun —/ });
  const flame = panel.getByRole("button", { name: /^Flame —/ });
  const angel = panel.getByRole("button", { name: /^Angel —/ });
  const confirm = panel.getByRole("button", { name: "Confirm choice" });
  await expect(confirm).toBeDisabled();
  await sun.click();
  await flame.click();
  await expect(sun).toHaveAttribute("aria-pressed", "true");
  await expect(sun).toHaveAccessibleName(/position 1/);
  await expect(sun).toContainText("1");
  await expect(flame).toContainText("2");
  await sun.click();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await expect(flame).toContainText("1");
  await sun.click();
  await angel.click();
  await expect(confirm).toBeEnabled();
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: "End turn" })).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.zones.library.map(
          (card: { id: string }) => card.id,
        ),
      ),
    )
    .toEqual(["bottom", "two", "one", "three"]);
});

test("touch hold inspects a paid library choice without choosing it", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(createRun(44).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Walled City & Wilderness" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
    { id: "three", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "dark", kept: false }];
  snapshot.state.zones.library = snapshot.state.deck
    .slice(1)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  const cdp = await context.newCDPSession(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  await page.getByRole("button", { name: /Wilderness dark/ }).tap();
  const panel = page.getByLabel("Committed inspection");
  const flame = panel.getByRole("button", { name: /^Flame —/ });
  const box = (await flame.boundingBox())!;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await page.waitForTimeout(600);
  await expect(page.getByRole("tooltip")).toContainText("Flame");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(panel).toBeVisible();
  await flame.tap();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Flame light/ })).toBeVisible();
  await context.close();
});

test("compact target choices keep cards and cancellation accessible", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Sacrifice & Self-Preservation" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Sacrifice light/ }).click();
  const panel = page.getByLabel("Selected card");
  await expect(panel.getByRole("button", { name: /^Angel —/ })).toBeInViewport({ ratio: 1 });
  await expect(panel.getByRole("button", { name: /^Sun —/ })).toBeInViewport({ ratio: 1 });
  await expect(panel.getByRole("button", { name: "Cancel" })).toBeInViewport({ ratio: 1 });
  for (const img of await panel.locator("img").all())
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await panel.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
});

function pileFixture() {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "held", pair: "Sun & Moon" },
    { id: "hidden", pair: "Censer & Plague Brazier" },
    { id: "bottom", pair: "Angel & Vampire" },
    { id: "top", pair: "Flame & Frost" },
    { id: "banished", pair: "Key & Lock" },
  ];
  const [held, hidden, bottom, top, banished] = snapshot.state.deck;
  snapshot.state.zones.hand = [{ ...held!, face: "light", kept: false }];
  snapshot.state.zones.library = [{ ...hidden!, face: "dark", kept: false }];
  snapshot.state.zones.discard = [
    { ...bottom!, face: "dark", kept: false },
    { ...top!, face: "light", kept: false },
  ];
  snapshot.state.zones.banished = [{ ...banished!, face: "dark", kept: false }];
  return snapshot;
}

test("pile inspection shows visible cards in order without exposing the library or changing the run", async ({
  page,
}) => {
  const snapshot = pileFixture();
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const pile = page.getByRole("button", { name: "Discard 2 · Banished 1" });
  await pile.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Discard" });
  await expect(dialog).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator(".battle-pile-card").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  const cards = dialog.locator(".battle-pile-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAccessibleName(/Top\. Flame light/);
  await expect(cards.nth(1)).toHaveAccessibleName(/Bottom\. Vampire dark/);
  await expect(dialog.getByRole("img", { name: /Plague Brazier|Censer/ })).toHaveCount(0);
  await cards.nth(1).focus();
  await expect(page.getByRole("tooltip")).toContainText("Vampire");
  await expect(page.getByRole("tooltip")).toContainText("Other face: Angel");
  await expect(page.getByRole("tooltip")).toContainText("Heal for the attack's final damage");
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(pile).toBeFocused();
  await pile.click();
  await page.getByRole("button", { name: "Banished 1", exact: true }).click();
  const banished = page.getByRole("dialog", { name: "Banished" });
  await expect(banished.getByRole("img", { name: /Lock dark/ })).toBeVisible();
  await expect(banished.getByRole("img", { name: /Flame|Vampire|Plague Brazier/ })).toHaveCount(0);
  await page.mouse.click(2, 2);
  await expect(banished).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
});

test("touch can inspect pile cards and switch piles without playing them", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(pileFixture()),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  await page.getByRole("button", { name: "Discard 2 · Banished 1" }).tap();
  const dialog = page.getByRole("dialog", { name: "Discard" });
  await dialog.getByRole("img", { name: /Flame light/ }).tap();
  await expect(page.getByRole("tooltip")).toContainText("Apply 3 Burn");
  await page.getByRole("button", { name: "Banished 1", exact: true }).tap();
  await expect(
    page.getByRole("dialog", { name: "Banished" }).getByRole("img", { name: /Lock dark/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).tap();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
  await context.close();
});

test("large piles scroll without losing their controls on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  const snapshot = pileFixture();
  const extras = Array.from({ length: 20 }, (_, index) => ({ id: `extra-${index}`, pair: "Sun & Moon" }));
  snapshot.state.deck.push(...extras);
  snapshot.state.zones.discard.push(
    ...extras.map((card) => ({ ...card, face: "light" as const, kept: false })),
  );
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Discard 22 · Banished 1" }).click();
  const dialog = page.getByRole("dialog", { name: "Discard" });
  const cards = dialog.locator(".battle-pile-card");
  await expect(cards).toHaveCount(22);
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.last()).toBeInViewport({ ratio: 1 });
  await expect(cards.last()).toHaveAccessibleName(/Bottom\. Vampire dark/);
  await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport({ ratio: 1 });
  await expect(dialog.getByRole("button", { name: "Banished 1" })).toBeInViewport({ ratio: 1 });
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});

test("Scry reveals only the current library top and follows later draws", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Measuring Rod & Twisted Ribbon" },
    { id: "draw", pair: "Key & Lock" },
    { id: "bottom", pair: "Sun & Moon" },
    { id: "middle", pair: "Angel & Vampire" },
    { id: "top", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck
    .slice(0, 2)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.library = [
    { ...snapshot.state.deck[2]!, face: "light", kept: false },
    { ...snapshot.state.deck[3]!, face: "dark", kept: false },
    { ...snapshot.state.deck[4]!, face: "light", kept: false },
  ];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("img", { name: "Library 3", exact: true })).toBeVisible();
  await expect(page.locator(".battle-pile-item--scry")).toHaveCount(0);
  await expect(page.locator('img[src$="card-flame.webp"], img[src$="card-vampire.webp"]')).toHaveCount(0);
  await page.getByRole("button", { name: /Measuring Rod light/ }).click();
  const revealed = page.getByRole("img", { name: /Library 3\. Scry\. Flame light/ });
  await expect(revealed).toBeVisible();
  await expect(revealed.locator("img")).toHaveAttribute("src", /card-flame\.webp$/);
  await expect(page.locator('img[src$="card-vampire.webp"]')).toHaveCount(0);
  await revealed.hover();
  await expect(page.getByRole("tooltip")).toContainText("Apply 3 Burn");
  await expect(page.getByRole("tooltip")).toContainText("Other face: Frost");
  await expect
    .poll(async () => {
      const tooltip = (await page.getByRole("tooltip").boundingBox())!;
      const hand = (await page.locator(".battle-hand").boundingBox())!;
      return (
        tooltip.x + tooltip.width <= hand.x ||
        hand.x + hand.width <= tooltip.x ||
        tooltip.y + tooltip.height <= hand.y ||
        hand.y + hand.height <= tooltip.y
      );
    })
    .toBe(true);
  await expect
    .poll(() => revealed.locator("img").evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: /Key light/ }).click();
  await expect(page.getByRole("img", { name: /Library 2\. Scry\. Vampire dark/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Library 2\. Scry\. Flame/ })).toHaveCount(0);
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.locator(".battle-pile-item--scry")).toHaveCount(0);
});

test("Scry on an empty library does not reveal or reshuffle the discard", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Measuring Rod & Twisted Ribbon" },
    { id: "discard", pair: "Sun & Moon" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [{ ...snapshot.state.deck[1]!, face: "dark", kept: false }];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Measuring Rod light/ }).click();
  await expect(page.getByRole("img", { name: "Library 0. Scry: empty" })).toBeVisible();
  await expect(page.locator(".battle-pile-item--scry")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Discard 2 · Banished 0" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.zones.library.length,
      ),
    )
    .toBe(0);
});

test("touch inspects a Scry reveal without spending mana or playing the card", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Measuring Rod & Twisted Ribbon" },
    { id: "top", pair: "Flame & Frost" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [{ ...snapshot.state.deck[1]!, face: "light", kept: false }];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  await page.getByRole("button", { name: /Measuring Rod light/ }).tap();
  const revealed = page.getByRole("img", { name: /Library 1\. Scry\. Flame light/ });
  await expect(revealed).toBeInViewport({ ratio: 1 });
  await revealed.tap();
  await expect(page.getByRole("tooltip")).toContainText("Apply 3 Burn");
  await expect(page.getByText(/Mana 2\/3/)).toBeVisible();
  await expect(revealed).toBeVisible();
  await context.close();
});

test("Scry follows a card moved onto an empty library", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "source", pair: "Convergence & Divergence" },
    { id: "one", pair: "Sun & Moon" },
    { id: "two", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [
    { ...snapshot.state.deck[1]!, face: "light", kept: false },
    { ...snapshot.state.deck[2]!, face: "dark", kept: false },
  ];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = true;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("img", { name: "Library 0. Scry: empty" })).toBeVisible();
  await page.getByRole("button", { name: /Convergence light/ }).click();
  const revealed = page.getByRole("img", { name: /Library 2\. Scry\. Vampire dark/ });
  await expect(revealed).toBeVisible();
  await expect(revealed.locator("img")).toHaveAttribute("src", /card-vampire\.webp$/);
});

test("a Scry reveal remains clear of the hand in a compact viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.zones.scry = true;
  const top = snapshot.state.zones.library.at(-1)!;
  top.pair = "Bloom & Wither";
  top.face = "dark";
  snapshot.state.deck.find((card) => card.id === top.id)!.pair = top.pair;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const revealed = page.locator(".battle-pile-item--scry");
  await expect(revealed).toBeInViewport({ ratio: 1 });
  const image = (await revealed.boundingBox())!;
  const hand = (await page.locator(".battle-hand").boundingBox())!;
  expect(
    image.x + image.width <= hand.x ||
      hand.x + hand.width <= image.x ||
      image.y + image.height <= hand.y ||
      hand.y + hand.height <= image.y,
  ).toBe(true);
  await revealed.locator('[role="img"]').hover();
  await expect(page.getByRole("tooltip")).toContainText("Wither");
  await expect
    .poll(async () => {
      const tip = (await page.getByRole("tooltip").boundingBox())!;
      const handBox = (await page.locator(".battle-hand-stage").boundingBox())!;
      const controls = (await page.locator(".battle-actions").boundingBox())!;
      const separate = (a: typeof tip, b: typeof tip) =>
        a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      return separate(tip, handBox) && separate(tip, controls);
    })
    .toBe(true);
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
});

test("active status counters explain their effects without changing the run", async ({ page }) => {
  const snapshot = pileFixture();
  snapshot.state.player.ward = 5;
  snapshot.state.player.curse = 2;
  snapshot.state.enemy.burn = 3;
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const player = page.getByRole("button", { name: "Player status: ward 5 · curse 2" });
  const enemy = page.getByRole("button", { name: "Enemy status: burn 3" });
  await player.hover();
  await expect(page.getByRole("tooltip")).toContainText("Absorbs damage");
  await expect(page.getByRole("tooltip")).toContainText("reduced damage per stack");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await player.focus();
  await expect(page.getByRole("tooltip")).toContainText("Ward");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await enemy.hover();
  await expect(page.getByRole("tooltip")).toContainText("Fire damage");
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: /Sun light/ }).focus();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await expect(page.getByRole("tooltip")).toContainText("Sun");
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await page.getByRole("button", { name: /Sun light/ }).click();
  await expect(page.getByRole("button", { name: "Player status: ward 5" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Player status:.*curse/ })).toHaveCount(0);
});

test("touch can inspect active statuses without consuming mana", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = pileFixture();
  snapshot.state.player.curse = 1;
  snapshot.state.enemy.burn = 3;
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Player status: curse 1" }).tap();
  await expect(page.getByRole("tooltip")).toContainText("reduced damage per stack");
  await page.getByRole("button", { name: "Enemy status: burn 3" }).tap();
  await expect(page.getByRole("tooltip")).toContainText("Fire damage");
  await expect(page.getByRole("tooltip")).not.toContainText("reduced damage per stack");
  await page.touchscreen.tap(2, 2);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
  await context.close();
});

function rootLashFixture() {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.encounters![0] = "mourning-tree";
  snapshot.state.enemy.hp = 36;
  snapshot.state.enemy.maxHp = 36;
  snapshot.state.action = 1;
  return snapshot;
}

test("enemy intent explains a modified attack and its trait before the turn resolves", async ({ page }) => {
  const snapshot = rootLashFixture();
  snapshot.state.enemy.bless = 2;
  snapshot.state.enemy.curse = 1;
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const intent = page.getByRole("button", { name: "Mourning Tree intent: 8 Growth · Curse 1" });
  await intent.hover();
  await expect(page.getByRole("tooltip")).toContainText("Root Snare: Apply 1 Curse");
  await expect(page.getByRole("tooltip")).toContainText("Current attack: 8 Growth");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await intent.focus();
  await expect(page.getByRole("tooltip")).toContainText("Root Lash");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText(/HP 22\/30/)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("You Curse +1");
  await expect(page.getByRole("button", { name: "Player status: curse 1" })).toBeVisible();
});

for (const condition of ["hush", "freeze"] as const) {
  test(`enemy intent reports ${condition} correctly and matches resolution`, async ({ page }) => {
    const snapshot = rootLashFixture();
    snapshot.state.enemy[condition] = true;
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const intent = page.getByRole("button", {
      name: `Mourning Tree intent: ${condition === "hush" ? "7 Growth" : "Skipped"}`,
    });
    await intent.hover();
    const tooltip = page.getByRole("tooltip");
    if (condition === "hush") {
      await expect(tooltip).toContainText("Deal 7 Growth damage");
      await expect(tooltip).toContainText("trait is suppressed");
      await expect(tooltip).not.toContainText("Apply 1 Curse");
    } else {
      await expect(tooltip).toContainText("Frozen: this action is skipped");
      await expect(tooltip).not.toContainText("Current attack");
    }
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(page.getByText(condition === "hush" ? /HP 23\/30/ : /HP 30\/30/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Player status:.*curse/ })).toHaveCount(0);
  });
}

for (const scenario of [
  {
    enemy: "hollow-king",
    name: "Hollow King",
    action: 2,
    hp: 48,
    attack: "7 Shadow",
    status: "curse",
    amount: 1,
  },
  {
    enemy: "the-mould-harpist",
    name: "The Mould Harpist",
    action: 2,
    hp: 30,
    attack: "4 Growth",
    status: "poison",
    amount: 2,
  },
  {
    enemy: "the-smiling-kiln",
    name: "The Smiling Kiln",
    action: 1,
    hp: 30,
    attack: "5 Fire",
    status: "burn",
    amount: 2,
  },
] as const) {
  test(`${scenario.name} announces its attack status even through Ward`, async ({ page }) => {
    const snapshot = structuredClone(createRun(42).getSnapshot());
    snapshot.state.encounters![0] = scenario.enemy;
    snapshot.state.enemy.hp = scenario.hp;
    snapshot.state.enemy.maxHp = scenario.hp;
    snapshot.state.action = scenario.action;
    snapshot.state.player.ward = 20;
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const status = `${scenario.status[0]!.toUpperCase()}${scenario.status.slice(1)} ${scenario.amount}`;
    const intent = page.getByRole("button", {
      name: `${scenario.name} intent: ${scenario.attack} · ${status}`,
      exact: true,
    });
    for (const size of [
      { width: 320, height: 480 },
      { width: 390, height: 844 },
      { width: 1280, height: 720 },
    ]) {
      await page.setViewportSize(size);
      await expect(intent).toBeInViewport({ ratio: 1 });
      const overlap = await intent.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [...document.querySelectorAll(".battle-card, .battle-actions button")].some((other) => {
          const box = other.getBoundingClientRect();
          return (
            bounds.left < box.right &&
            bounds.right > box.left &&
            bounds.top < box.bottom &&
            bounds.bottom > box.top
          );
        });
      });
      expect(overlap).toBe(false);
    }
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(`Player status:.*${scenario.status} ${scenario.amount}`) }),
    ).toBeVisible();
    await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "30");
  });
}

for (const condition of ["active", "hush", "freeze"] as const) {
  test(`reactive intent shows ${condition} correctly before attack cards`, async ({ page }) => {
    const snapshot = structuredClone(createRun(42).getSnapshot());
    snapshot.state.encounters![0] = "the-thorned-librarian";
    snapshot.state.enemy.hp = 10;
    snapshot.state.enemy.maxHp = 26;
    snapshot.state.action = 1;
    snapshot.state.player.hp = 20;
    if (condition === "hush") snapshot.state.enemy.hush = true;
    if (condition === "freeze") snapshot.state.enemy.freeze = true;
    snapshot.state.deck = [
      { id: "sun-1", pair: "Sun & Moon" },
      { id: "sun-2", pair: "Sun & Moon" },
    ];
    snapshot.state.zones.hand = snapshot.state.deck.map((card) => ({ ...card, face: "light", kept: false }));
    snapshot.state.zones.library = [];
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const text =
      condition === "hush"
        ? "4 Binding"
        : condition === "freeze"
          ? "Skipped · 1 Binding after your attacks"
          : "4 Binding · 1 Binding after your attacks";
    const intent = page.getByRole("button", { name: `The Thorned Librarian intent: ${text}`, exact: true });
    await expect(intent).toBeInViewport({ ratio: 1 });
    const overlap = await intent.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return [...document.querySelectorAll(".battle-card, .battle-actions button")].some((other) => {
        const box = other.getBoundingClientRect();
        return (
          bounds.left < box.right &&
          bounds.right > box.left &&
          bounds.top < box.bottom &&
          bounds.bottom > box.top
        );
      });
    });
    expect(overlap).toBe(false);
    await intent.hover();
    if (condition === "freeze")
      await expect(page.getByRole("tooltip")).toContainText("once per direct attack card");
    await page
      .getByRole("button", { name: /^Sun light/ })
      .first()
      .click();
    await expect(page.locator(".battle-player")).toHaveAttribute(
      "data-player-hp",
      condition === "hush" ? "20" : "19",
    );
    await page.getByRole("button", { name: /^Sun light/ }).click();
    await expect(page.getByRole("heading", { name: "Rewards", exact: true })).toBeVisible();
    await expect(
      page.getByText(`HP ${condition === "hush" ? "20" : "19"}/30`, { exact: true }),
    ).toBeVisible();
  });
}

async function expectIntentClear(intent: Locator) {
  await expect(intent).toBeInViewport({ ratio: 1 });
  const overlap = await intent.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [...document.querySelectorAll(".battle-card, .battle-actions button")].some((other) => {
      const box = other.getBoundingClientRect();
      return (
        bounds.left < box.right &&
        bounds.right > box.left &&
        bounds.top < box.bottom &&
        bounds.bottom > box.top
      );
    });
  });
  expect(overlap).toBe(false);
}

for (const condition of ["active", "hush", "freeze"] as const) {
  test(`Raven intent tracks the latest attack with ${condition}`, async ({ page }) => {
    const snapshot = structuredClone(createRun(42).getSnapshot());
    snapshot.state.encounters![0] = "the-painted-raven";
    snapshot.state.enemy.hp = 26;
    snapshot.state.enemy.maxHp = 26;
    snapshot.state.action = 1;
    if (condition === "hush") snapshot.state.enemy.hush = true;
    if (condition === "freeze") snapshot.state.enemy.freeze = true;
    snapshot.state.deck = [{ id: "sun", pair: "Sun & Moon" }];
    snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
    snapshot.state.zones.library = [];
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const initial =
      condition === "active"
        ? "3 Memory · copies your last hit"
        : condition === "hush"
          ? "3 Memory"
          : "Skipped";
    await expectIntentClear(
      page.getByRole("button", { name: `The Painted Raven intent: ${initial}`, exact: true }),
    );
    await page.getByRole("button", { name: /^Sun light/ }).click();
    const after = condition === "active" ? "6 Memory · copies your last hit" : initial;
    await expect(
      page.getByRole("button", { name: `The Painted Raven intent: ${after}`, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute(
      "data-player-hp",
      condition === "active" ? "24" : condition === "hush" ? "27" : "30",
    );
  });
}

for (const condition of ["active", "hush", "freeze"] as const) {
  test(`Sunken Sun previews the forced next hand with ${condition}`, async ({ page }) => {
    const snapshot = structuredClone(createRun(42).getSnapshot());
    snapshot.state.encounters![0] = "the-sunken-sun";
    snapshot.state.enemy.hp = 42;
    snapshot.state.enemy.maxHp = 42;
    snapshot.state.action = 1;
    if (condition === "hush") snapshot.state.enemy.hush = true;
    if (condition === "freeze") snapshot.state.enemy.freeze = true;
    snapshot.state.deck = Array.from({ length: 5 }, (_, index) => ({
      id: `card-${index}`,
      pair: "Sun & Moon",
    }));
    snapshot.state.zones.hand = [snapshot.state.deck[0]!].map((card) => ({
      ...card,
      face: "light",
      kept: false,
    }));
    snapshot.state.zones.library = snapshot.state.deck
      .slice(1)
      .map((card) => ({ ...card, face: "light", kept: false }));
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const intent =
      condition === "active"
        ? "4 Radiance · next hand dark"
        : condition === "hush"
          ? "4 Radiance"
          : "Skipped";
    await expectIntentClear(
      page.getByRole("button", { name: `The Sunken Sun intent: ${intent}`, exact: true }),
    );
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(page.locator(".battle-card")).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: condition === "active" ? /^Moon dark/ : /^Sun light/ }),
    ).toHaveCount(5);
    await expect(page.locator(".battle-player")).toHaveAttribute(
      "data-player-hp",
      condition === "freeze" ? "30" : "26",
    );
  });
}

for (const scenario of [
  { id: "the-marble-nurse", name: "The Marble Nurse", hp: 24, cue: "next draw −1", resource: "draw" },
  { id: "the-pearl-taxman", name: "The Pearl Taxman", hp: 26, cue: "next mana −1", resource: "mana" },
] as const) {
  for (const condition of ["active", "hush", "freeze"] as const) {
    test(`${scenario.name} previews the next-turn penalty with ${condition}`, async ({ page }) => {
      const snapshot = structuredClone(createRun(42).getSnapshot());
      snapshot.state.encounters![0] = scenario.id;
      snapshot.state.enemy.hp = scenario.hp;
      snapshot.state.enemy.maxHp = scenario.hp;
      snapshot.state.action = 1;
      snapshot.state.player.ward = 20;
      if (condition === "hush") snapshot.state.enemy.hush = true;
      if (condition === "freeze") snapshot.state.enemy.freeze = true;
      await page.addInitScript(
        (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
        encodeRun(snapshot),
      );
      await page.setViewportSize({ width: 320, height: 480 });
      await page.goto("/");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      const intent =
        condition === "freeze" ? "Skipped" : `4 Binding${condition === "active" ? ` · ${scenario.cue}` : ""}`;
      await expectIntentClear(
        page.getByRole("button", { name: `${scenario.name} intent: ${intent}`, exact: true }),
      );
      await page.getByRole("button", { name: "End turn" }).click();
      await expect(page.locator(".battle-player")).toHaveAttribute(
        "data-mana",
        scenario.resource === "mana" && condition === "active" ? "2" : "3",
      );
      await expect(page.locator(".battle-card")).toHaveCount(
        scenario.resource === "draw" && condition === "active" ? 4 : 5,
      );
    });
  }
}

for (const scenario of [
  {
    id: "the-bone-cartographer",
    name: "The Bone Cartographer",
    hp: 28,
    attack: "4 Memory",
    cue: "up to 2 from library top → bottom",
  },
  {
    id: "the-fogbound-weaver",
    name: "The Fogbound Weaver",
    hp: 28,
    attack: "4 Binding",
    cue: "up to 2 kept → library top",
  },
  {
    id: "the-wax-regent",
    name: "The Wax Regent",
    hp: 36,
    attack: "4 Fire · Burn 1",
    cue: "up to 1 kept → library top",
  },
] as const) {
  for (const condition of ["active", "hush", "freeze"] as const) {
    test(`${scenario.name} previews card movement with ${condition}`, async ({ page }) => {
      const snapshot = structuredClone(createRun(42).getSnapshot());
      snapshot.state.encounters![0] = scenario.id;
      snapshot.state.enemy.hp = scenario.hp;
      snapshot.state.enemy.maxHp = scenario.hp;
      snapshot.state.action = 1;
      if (condition === "hush") snapshot.state.enemy.hush = true;
      if (condition === "freeze") snapshot.state.enemy.freeze = true;
      await page.addInitScript(
        (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
        encodeRun(snapshot),
      );
      await page.setViewportSize({ width: 320, height: 480 });
      await page.goto("/");
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await page.getByRole("button", { name: "Continue run" }).click();
      const base = condition === "hush" ? scenario.attack.split(" · ")[0] : scenario.attack;
      const intent =
        condition === "freeze" ? "Skipped" : `${base}${condition === "active" ? ` · ${scenario.cue}` : ""}`;
      await expectIntentClear(
        page.getByRole("button", { name: `${scenario.name} intent: ${intent}`, exact: true }),
      );
    });
  }
}

test("touch inspects the enemy portrait and intent without advancing combat", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const saved = encodeRun(rootLashFixture());
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("img", { name: "Mourning Tree, 36 of 36 HP" }).tap();
  await expect(page.getByRole("tooltip")).toContainText("Weakness: Decay");
  await page.getByRole("button", { name: "Mourning Tree intent: 7 Growth · Curse 1" }).tap();
  await expect(page.getByRole("tooltip")).toContainText("Root Snare: Apply 1 Curse");
  await expect(page.getByRole("tooltip")).not.toContainText("Weakness: Decay");
  await page.touchscreen.tap(2, 2);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
  await context.close();
});

test("a card that cannot pay its HP cost is inspectable and becomes playable after healing", async ({
  page,
}) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "fallen", pair: "Seraph & Fallen Seraph" },
    { id: "bloom", pair: "Bloom & Wither" },
  ];
  snapshot.state.zones.hand = [
    { ...snapshot.state.deck[0]!, face: "dark", kept: false },
    { ...snapshot.state.deck[1]!, face: "light", kept: false },
  ];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  snapshot.state.player.hp = 2;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const fallen = page.getByRole("button", { name: /Fallen Seraph dark/ });
  await expect(fallen).toHaveAttribute("aria-disabled", "true");
  await expect(fallen).toHaveAttribute("data-exhausted", "true");
  await fallen.hover();
  await expect(page.getByRole("tooltip")).toContainText("Not enough HP to pay this cost.");
  const box = (await fallen.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByText(/Mana 3\/3/)).toBeVisible();
  await page.getByRole("button", { name: /Bloom light/ }).click();
  await expect(page.getByText(/HP 6\/30/)).toBeVisible();
  await expect(fallen).not.toHaveAttribute("aria-disabled");
  await fallen.click();
  await expect(page.getByText(/HP 4\/30/)).toBeVisible();
  await expect(page.getByText(/Mana 1\/3/)).toBeVisible();
});

test("touching an unavailable card explains the cost without playing it", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.mana = 0;
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const card = page.locator(".battle-card").first();
  const box = (await card.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("tooltip")).toContainText("Not enough mana.");
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await expect(page.getByText(/Mana 0\/3/)).toBeVisible();
  await context.close();
});

test("combat feedback shows Curse being spent so attack order stays understandable", async ({ page }) => {
  const snapshot = rootLashFixture();
  snapshot.state.player.hp = 13;
  snapshot.state.player.curse = 2;
  snapshot.state.enemy.curse = 2;
  snapshot.state.deck = [
    { id: "vampire", pair: "Angel & Vampire" },
    { id: "wither", pair: "Bloom & Wither" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card) => ({ ...card, face: "dark", kept: false }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const vampire = page.getByRole("button", { name: /Vampire dark/ });
  const wither = page.getByRole("button", { name: /Wither dark/ });
  await vampire.hover();
  await expect(page.getByRole("tooltip")).toContainText("Current attack: 1 Shadow damage");
  await vampire.click();
  await expect(page.getByRole("status")).toContainText("You Curse −2");
  await expect(page.getByText(/HP 14\/30/)).toBeVisible();
  await wither.hover();
  await expect(page.getByRole("tooltip")).toContainText("Current attack: 9 Decay damage");
  await wither.click();
  await expect(page.getByRole("heading", { name: "Mourning Tree · 26/36" })).toBeVisible();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText(/HP 9\/30/)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Enemy Curse −2");
  await expect(page.getByRole("status")).toContainText("You Curse +1");
});

test("multi-effect combat feedback stays clear of the hand and actions at common window sizes", async ({
  page,
}) => {
  const snapshot = rootLashFixture();
  snapshot.state.player.hp = 20;
  snapshot.state.enemy.curse = 2;
  snapshot.state.enemy.burn = 3;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  for (const viewport of [
    { width: 320, height: 480 },
    { width: 390, height: 844 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await page.getByRole("button", { name: "End turn" }).click();
    const feedback = page.getByRole("status");
    await expect(feedback).toContainText("Enemy Curse −2");
    const overlaps = await page.evaluate(() => {
      const status = document
        .querySelector('.battle-screen--active > [role="status"]')!
        .getBoundingClientRect();
      return [...document.querySelectorAll(".battle-card, .battle-actions button")].flatMap((element) => {
        const box = element.getBoundingClientRect();
        return status.left < box.right &&
          status.right > box.left &&
          status.top < box.bottom &&
          status.bottom > box.top
          ? [
              {
                status: status.toJSON(),
                box: box.toJSON(),
                label: element.getAttribute("aria-label") || element.textContent,
              },
            ]
          : [];
      });
    });
    expect(overlaps, `feedback overlaps controls at ${viewport.width}×${viewport.height}`).toEqual([]);
  }
});

test("the run deck is inspectable before rewards and remains unchanged until a choice", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.phase = "reward";
  snapshot.state.offers = ["Sanctuary & Prison"];
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const opener = page.getByRole("button", { name: "Deck 10", exact: true });
  await page.mouse.move(5, 5);
  await opener.focus();
  await page.keyboard.press("Enter");
  const deck = page.getByRole("dialog", { name: "Deck · 10" });
  await expect(deck).toBeFocused();
  await expect(deck.locator(".battle-deck-pair")).toHaveCount(5);
  const pair = deck.getByRole("button", { name: /^Angel & Vampire, 2 copies/ });
  await page.keyboard.press("Shift+Tab");
  await expect(deck.locator(".battle-deck-pair button").last()).toBeFocused();
  for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+Tab");
  await expect(pair).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
  await expect(page.getByRole("tooltip")).toContainText("Deal 3 Shadow damage");
  await expect(new AxeBuilder({ page }).analyze()).resolves.toHaveProperty("violations", []);
  await page.keyboard.press("Escape");
  await expect(deck).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(deck).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await page.getByRole("button", { name: /^Sanctuary & Prison/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.deck.length),
    )
    .toBe(11);
  await page.getByRole("button", { name: /Discard .* Banished/ }).click();
  await page.getByRole("button", { name: "Deck 11", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Deck · 11" })
      .getByRole("button", { name: /^Sanctuary & Prison, 1 copy/ }),
  ).toBeVisible();
});

test("deck inspection does not reveal library order or current hidden faces", async ({ browser }) => {
  const original = structuredClone(createRun(22).getSnapshot());
  const changed = structuredClone(original);
  changed.state.zones.library.reverse();
  changed.state.zones.library.forEach((card) => {
    card.face = card.face === "light" ? "dark" : "light";
  });
  const observed: string[][] = [];
  for (const snapshot of [original, changed]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const saved = encodeRun(snapshot);
    await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await page.getByRole("button", { name: /Discard .* Banished/ }).click();
    await page.getByRole("button", { name: "Deck 10", exact: true }).click();
    const deck = page.getByRole("dialog", { name: "Deck · 10" });
    observed.push(
      await deck
        .locator(".battle-deck-pair button")
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")!)),
    );
    expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
    await context.close();
  }
  expect(observed[0]).toEqual(observed[1]);
});

test("touch can inspect the deck on an expedition route without choosing it", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(
    createRun(31, { id: "deck-route", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const saved = encodeRun(game.getSnapshot());
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  await page.getByRole("button", { name: "Deck 10", exact: true }).tap();
  const deck = page.getByRole("dialog", { name: "Deck · 10" });
  const pair = deck.getByRole("button", { name: /^Angel & Vampire, 2 copies/ });
  await pair.tap();
  await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
  await expect(page.getByRole("tooltip")).toContainText("Deal 3 Shadow damage");
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await deck.getByRole("button", { name: "Close" }).tap();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await page.getByRole("button", { name: /^Rest: heal \d+/ }).tap();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toHaveCount(0);
  await context.close();
});

test("a large deck scrolls in a small window without losing controls or stale inspection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  snapshot.state.deck = Object.keys(cards)
    .slice(0, 24)
    .map((pair, index) => ({ id: `deck-${index}`, pair }));
  const saved = encodeRun(snapshot);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Deck 24", exact: true }).click();
  const deck = page.getByRole("dialog", { name: "Deck · 24" });
  const grid = deck.locator(".battle-deck-grid");
  await deck.locator(".battle-deck-pair button").first().click();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await grid.hover();
  await page.mouse.wheel(0, 3000);
  await expect(page.getByRole("tooltip", { name: /Angel.*Vampire/ })).toHaveCount(0);
  await expect(deck.locator(".battle-deck-pair button").last()).toBeInViewport({ ratio: 1 });
  await expect(deck.getByRole("button", { name: "Close" })).toBeInViewport({ ratio: 1 });
  await deck.getByRole("button", { name: "Close" }).click();
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
});

test("antihero selection shows the supplied artwork and starts a dark Witch expedition", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => {
    Math.random = () => 0;
    localStorage.setItem("dusk-and-dawn.expeditions.v1", JSON.stringify({ completed: ["prior-run"] }));
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const choices = page.getByRole("group", { name: "Antiheroes" });
  await expect(choices.locator("img")).toHaveCount(3);
  for (const art of await choices.locator("img").all()) {
    await expect.poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const bounds = (await art.boundingBox())!;
    expect(bounds.width / bounds.height).toBeCloseTo(4 / 3, 1);
  }
  const witch = choices.getByRole("button", { name: /^The Thorn Witch/ });
  await witch.hover();
  await expect(page.getByRole("tooltip")).toContainText("apply 1 Curse");
  await witch.click();
  await expect(witch).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBeNull();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await page.getByLabel("Starting orientation").selectOption("dark");
  await page.getByLabel("Run relic").selectOption("cracked-vessel");
  await expect(page.getByRole("button", { name: "Start expedition" })).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("button", { name: "The Thorn Witch, HP 24/24" })).toBeVisible();
  await expect(page.locator(".battle-card").first()).toContainText("dark");
  await page.locator(".battle-card").first().hover();
  await expect(page.getByRole("tooltip")).toContainText("apply 1 Curse before this effect");
  await page.locator(".battle-card").first().click();
  await expect(page.getByRole("button", { name: /Enemy status:.*curse 1/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.hero),
    )
    .toBe("thorn-witch");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: "The Thorn Witch, HP 24/24" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Enemy status:.*curse 1/ })).toBeVisible();
});

test("a legacy Cracked Vessel save keeps its original cap and matching relic description", async ({
  page,
}) => {
  const old = structuredClone(
    createRun(
      42,
      { id: "old-vessel", tier: 1, orientation: "light", relic: "cracked-vessel" },
      "thorn-witch",
    ).getSnapshot(),
  );
  old.state.player.maxHp = 30;
  old.state.player.hp = 24;
  await page.addInitScript((save) => localStorage.setItem("dusk-and-dawn.save.v1", save), encodeRun(old));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const health = page.getByRole("button", { name: "The Thorn Witch, HP 24/30" });
  await health.hover();
  await expect(page.getByRole("tooltip")).toContainText("Started at 24 HP with an extra pair.");
  await expect(page.getByRole("tooltip")).not.toContainText("Maximum 24 HP");
});

test("the Oracle reveals the next library card every turn and survives resume", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: /^The Veiled Oracle/ }).click();
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 30/30" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Library 5\. Scry\./ })).toBeVisible();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByRole("img", { name: "Library 0. Scry: empty" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 26/30" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Library 0. Scry: empty" })).toBeVisible();
});

test("the Seraph previews Ward on light support but not direct attacks", async ({ page }) => {
  const snapshot = structuredClone(createRun(17, undefined, "oathless-seraph").getSnapshot());
  snapshot.state.deck = [
    { id: "attack", pair: "Sun & Moon" },
    { id: "support", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(snapshot));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const health = page.getByRole("button", { name: "The Oathless Seraph, HP 30/30" });
  await health.hover();
  await expect(page.getByRole("tooltip")).toContainText("Before each light card without a direct attack");
  const sun = page.getByRole("button", { name: /^Sun light/ });
  await sun.hover();
  await expect(page.getByRole("tooltip")).not.toContainText("gain 1 Ward before this effect");
  await sun.click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "0");
  const angel = page.getByRole("button", { name: /^Angel light/ });
  await angel.hover();
  await expect(page.getByRole("tooltip")).toContainText("gain 1 Ward before this effect");
  await angel.click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "6");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "6");
});

test("touching an antihero selects it and reveals its passive before starting", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  const witch = page.getByRole("button", { name: /^The Thorn Witch/ });
  await witch.tap();
  await expect(witch).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("tooltip")).toContainText("Before each dark card resolves, apply 1 Curse");
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBeNull();
  const oracle = page.getByRole("button", { name: /^The Veiled Oracle/ });
  await oracle.tap();
  await expect(oracle).toHaveAttribute("aria-pressed", "true");
  await expect(witch).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("tooltip")).toContainText("Scry at the start of each turn");
  await page.getByRole("button", { name: "Start expedition" }).tap();
  await expect(page.getByRole("button", { name: "The Veiled Oracle, HP 30/30" })).toBeVisible();
  await context.close();
});

test("turning the hand previews only changed faces and counts duplicate cards", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "sunrise", pair: "Sunrise & Eclipse" },
    { id: "first", pair: "Angel & Vampire" },
    { id: "moon", pair: "Sun & Moon" },
    { id: "second", pair: "Angel & Vampire" },
    { id: "sun", pair: "Sun & Moon" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card, index) => ({
    ...card,
    face: index === 0 || index === 4 ? "light" : "dark",
    kept: false,
  }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const sunrise = page.getByRole("button", { name: /Sunrise light/ });
  await sunrise.hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Light face preview: Vampire → Angel ×2; Moon → Sun.");
  await expect(tip).not.toContainText("Sun → Moon");
  await page.mouse.move(5, 5);
  await page.keyboard.press("Tab");
  await sunrise.focus();
  await page.setViewportSize({ width: 320, height: 480 });
  await expect(tip).toBeInViewport({ ratio: 1 });
  await expect(tip).toContainText("Vampire → Angel ×2");
  await page.setViewportSize({ width: 1280, height: 720 });
  await sunrise.click();
  await expect(page.getByRole("button", { name: /Angel light/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Sun light/ })).toHaveCount(2);
  await expect(page.getByText(/Mana 2\/3/)).toBeVisible();
});

test("the original Extinguished Candle previews dark faces", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "candle", pair: "Candle & Extinguished Candle" },
    { id: "angel", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = [
    { ...snapshot.state.deck[0]!, face: "dark", kept: false },
    { ...snapshot.state.deck[1]!, face: "light", kept: false },
  ];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const candle = page.getByRole("button", { name: /Extinguished Candle dark/ });
  await candle.hover();
  await expect(page.getByRole("tooltip")).toContainText("Dark face preview: Angel → Vampire.");
  await candle.click();
  await expect(page.getByRole("button", { name: /Vampire dark/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Extinguished Candle dark/ })).toHaveCount(0);
});

test("a turn effect reports when no other faces would change", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "sunrise", pair: "Sunrise & Eclipse" },
    { id: "angel", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Sunrise light/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("Light face preview: no other cards change.");
});

for (const scenario of [
  { label: "uses Scry without exposing deeper cards", reveal: true, topFace: "dark" },
  { label: "keeps the draw hidden", reveal: false, topFace: "dark" },
  { label: "recognizes an already light draw", reveal: true, topFace: "light" },
] as const) {
  test(`draw-and-turn preview ${scenario.label}`, async ({ page }) => {
    const snapshot = structuredClone(createRun(22).getSnapshot());
    snapshot.state.deck = [
      { id: "atrium", pair: "Golden Atrium & Black Atrium" },
      { id: "moon", pair: "Sun & Moon" },
      { id: "hidden", pair: "Flame & Frost" },
      { id: "top", pair: "Angel & Vampire" },
    ];
    snapshot.state.zones.hand = [
      { ...snapshot.state.deck[0]!, face: "light", kept: false },
      { ...snapshot.state.deck[1]!, face: "dark", kept: false },
    ];
    snapshot.state.zones.library = [
      { ...snapshot.state.deck[2]!, face: "light", kept: false },
      { ...snapshot.state.deck[3]!, face: scenario.topFace, kept: false },
    ];
    snapshot.state.zones.discard = [];
    snapshot.state.zones.banished = [];
    snapshot.state.zones.scry = scenario.reveal;
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const atrium = page.getByRole("button", { name: /Golden Atrium light/ });
    await atrium.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toContainText("Light face preview: Moon → Sun.");
    if (scenario.reveal && scenario.topFace === "dark")
      await expect(tip).toContainText("Draw and turn: Vampire → Angel.");
    else if (scenario.reveal) await expect(tip).toContainText("Draw and turn: Angel remains light.");
    else {
      await expect(tip).toContainText("its identity is not revealed yet");
      await expect(tip).not.toContainText("Vampire");
    }
    await expect(tip).not.toContainText("Flame");
    await atrium.click();
    await expect(page.getByRole("button", { name: /Angel light/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sun light/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Golden Atrium light/ })).toHaveCount(0);
  });
}

test("draw-and-turn preview reports an empty draw without exposing a card", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "atrium", pair: "Golden Atrium & Black Atrium" },
    { id: "moon", pair: "Sun & Moon" },
  ];
  snapshot.state.zones.hand = [
    { ...snapshot.state.deck[0]!, face: "light", kept: false },
    { ...snapshot.state.deck[1]!, face: "dark", kept: false },
  ];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = true;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const atrium = page.getByRole("button", { name: /Golden Atrium light/ });
  await atrium.hover();
  await expect(page.getByRole("tooltip")).toContainText("No card will be drawn.");
  await atrium.click();
  await expect(page.getByRole("button", { name: /Sun light/ })).toBeVisible();
  await expect(page.locator(".battle-card")).toHaveCount(1);
});

test("random Flip preview counts repeated eligible faces", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "marionette", pair: "Puppeteer & Marionette" },
    { id: "first", pair: "Sun & Moon" },
    { id: "second", pair: "Sun & Moon" },
    { id: "angel", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck.map((card, index) => ({
    ...card,
    face: index === 0 ? "dark" : "light",
    kept: false,
  }));
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const marionette = page.getByRole("button", { name: /Marionette dark/ });
  await marionette.hover();
  await expect(page.getByRole("tooltip")).toContainText("Sun → Moon ×2; Angel → Vampire");
  await marionette.click();
  await expect(page.locator(".battle-card[data-kept]")).toHaveCount(1);
});

test("Scry-aware flip previews show the revealed draw without exposing deeper cards", async ({ page }) => {
  const snapshot = structuredClone(createRun(22, undefined, "veiled-oracle").getSnapshot());
  snapshot.state.deck = [
    { id: "key", pair: "Key & Lock" },
    { id: "held", pair: "Sun & Moon" },
    { id: "hidden", pair: "Flame & Frost" },
    { id: "top", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = snapshot.state.deck
    .slice(0, 2)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.library = snapshot.state.deck
    .slice(2)
    .map((card) => ({ ...card, face: "light", kept: false }));
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = true;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const key = page.getByRole("button", { name: /Key light/ });
  await key.hover();
  await expect(page.getByRole("tooltip")).toContainText("Draw and Flip: Angel → Vampire");
  await expect(page.getByRole("tooltip")).not.toContainText("identity is not revealed");
  await expect(page.getByRole("tooltip")).not.toContainText("Flame");
  await key.click();
  await expect(page.getByRole("button", { name: /Vampire dark/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Moon dark/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Library 1\. Scry\. Flame light/ })).toBeVisible();
});

test("flip previews keep an unrevealed draw secret", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [
    { id: "key", pair: "Key & Lock" },
    { id: "hidden", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [{ ...snapshot.state.deck[1]!, face: "light", kept: false }];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = false;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Key light/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("identity is not revealed yet");
  await expect(page.getByRole("tooltip")).not.toContainText("Angel");
});

test("a draw-and-flip preview identifies an empty draw without reshuffling", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.deck = [{ id: "key", pair: "Key & Lock" }];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = true;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Key light/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("No card will be drawn.");
  await expect(page.getByRole("tooltip")).not.toContainText("Draw and Flip:");
});

test("a pre-tuning Witch save retains its Poison passive in the UI and on play", async ({ page }) => {
  const snapshot = structuredClone(createRun(22, undefined, "thorn-witch").getSnapshot());
  delete snapshot.state.heroRuleset;
  snapshot.state.deck = [{ id: "lock", pair: "Key & Lock" }];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "dark", kept: false }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [];
  snapshot.state.zones.banished = [];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /The Thorn Witch, HP/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("apply 2 Poison");
  const lock = page.getByRole("button", { name: /Lock dark/ });
  await lock.hover();
  await expect(page.getByRole("tooltip")).toContainText("apply 2 Poison before this effect");
  await lock.click();
  await expect(page.getByRole("button", { name: /Enemy status:.*poison 2/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Enemy status:.*curse/ })).toHaveCount(0);
});

test("an empty Scry library does not reveal the card drawn after reshuffling", async ({ page }) => {
  const snapshot = structuredClone(createRun(22, undefined, "veiled-oracle").getSnapshot());
  snapshot.state.deck = [
    { id: "key", pair: "Key & Lock" },
    { id: "discarded", pair: "Angel & Vampire" },
  ];
  snapshot.state.zones.hand = [{ ...snapshot.state.deck[0]!, face: "light", kept: false }];
  snapshot.state.zones.library = [];
  snapshot.state.zones.discard = [{ ...snapshot.state.deck[1]!, face: "light", kept: false }];
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = true;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /Key light/ }).hover();
  await expect(page.getByRole("tooltip")).toContainText("identity is not revealed yet");
  await expect(page.getByRole("tooltip")).not.toContainText("Angel");
  await page.getByRole("button", { name: /Key light/ }).click();
  await expect(page.getByRole("button", { name: /Vampire dark/ })).toBeVisible();
});

test("Ashen Seal previews and preserves its self-Banish Ward with the Seraph", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      17,
      { id: "ashen-ui", tier: 1, orientation: "light", relic: "ashen-seal" },
      "oathless-seraph",
    ).getSnapshot(),
  );
  const state = initial.state;
  const source = [...state.zones.hand, ...state.zones.library].find(
    (card) => card.pair === "Bloom & Wither",
  )!;
  state.zones.library = state.zones.library.filter((card) => card.id !== source.id);
  if (!state.zones.hand.some((card) => card.id === source.id)) state.zones.hand.push(source);
  state.player.hp = 26;
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", saved);
  }, encodeRun(initial));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const card = page.getByRole("button", { name: /^Bloom light/ }).first();
  await card.hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Ashen Seal" })).toContainText(
    "gain 2 Ward after this card Banishes itself",
  );
  await card.click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "3");
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "30");
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.player?.ward,
      ),
    )
    .toBe(3);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "3");
  await page.getByRole("button", { name: /The Oathless Seraph, HP/ }).hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "Ashen Seal" })).toContainText("gain 2 Ward");
});

test("Hollow Chalice previews capped healing for skipping and persists the lean deck", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      17,
      { id: "chalice-ui", tier: 1, orientation: "light", relic: "hollow-chalice" },
      "veiled-oracle",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = ["Flame & Frost"];
  initial.state.player.hp = 28;
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", saved);
  }, encodeRun(initial));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Skip reward · +2 HP" }).click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deck 10" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.player?.hp,
      ),
    )
    .toBe(30);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: "Deck 10" })).toBeVisible();
  await page.getByRole("button", { name: /^Rest:/ }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "30");
});

for (const hp of [25, 28, 30]) {
  test(`route shows ${hp}/30 HP and previews capped rest healing`, async ({ page }) => {
    const initial = structuredClone(
      createRun(
        31,
        { id: `route-health-${hp}`, tier: 1, orientation: "light", relic: "hollow-chalice" },
        "thorn-witch",
      ).getSnapshot(),
    );
    initial.state.phase = "reward";
    initial.state.offers = [];
    initial.state.player.hp = hp;
    const game = restoreSession(initial, runHandler);
    game.dispatch({ type: "reward", pair: null });
    const saved = encodeRun(game.getSnapshot());
    await page.addInitScript((data) => {
      if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
    }, saved);
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const health = page.getByRole("button", { name: `The Thorn Witch, HP ${hp}/30` });
    await expect(health).toBeVisible();
    await page.keyboard.press("Tab");
    await health.focus();
    const tip = page.getByRole("tooltip").filter({ hasText: "Hollow Chalice" });
    await expect(tip).toContainText("Before each dark card resolves");
    const amount = Math.min(4, 30 - hp);
    const rest = page.getByRole("button", { name: `Rest: heal ${amount} HP` });
    await expect(rest).toContainText(`Rest · +${amount} HP`);
    expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
    await page.reload();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await expect(page.getByRole("button", { name: `The Thorn Witch, HP ${hp}/30` })).toBeVisible();
    await page.getByRole("button", { name: `Rest: heal ${amount} HP` }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", String(hp + amount));
  });
}

test("reward health stays visible and shows relic details without changing the save", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      9,
      { id: "reward-health", tier: 1, orientation: "light", relic: "hollow-chalice" },
      "veiled-oracle",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = ["Flame & Frost"];
  initial.state.player.hp = 27;
  const saved = encodeRun(initial);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const health = page.getByRole("button", { name: "The Veiled Oracle, HP 27/30" });
  await expect(health).toBeInViewport();
  await expect(page.getByRole("button", { name: "Skip reward · +3 HP" })).toBeVisible();
  await page.keyboard.press("Tab");
  await health.focus();
  await expect(page.getByRole("tooltip").filter({ hasText: "Hollow Chalice" })).toContainText("Heal 3 HP");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
});

for (const hp of [28, 30]) {
  test(`midpoint rest previews its actual healing at ${hp} HP`, async ({ page }) => {
    const snapshot = structuredClone(createRun(9).getSnapshot());
    snapshot.state.phase = "rest";
    snapshot.state.fight = 1;
    snapshot.state.player.hp = hp;
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    await expect(page.getByText(`HP ${hp}/30`)).toBeVisible();
    await page.getByRole("button", { name: `Heal ${30 - hp} HP` }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "30");
  });
}

for (const fight of [0, 1]) {
  test(`a scrolled reward opens the next ${fight === 0 ? "route" : "rest"} at the top on a phone`, async ({
    page,
  }) => {
    const initial = structuredClone(
      createRun(
        9,
        { id: `scroll-${fight}`, tier: 1, orientation: "light", relic: "none" },
        "oathless-seraph",
      ).getSnapshot(),
    );
    initial.state.phase = "reward";
    initial.state.fight = fight;
    initial.state.player.hp = 28;
    initial.state.offers = ["Flame & Frost", "Sun & Moon", "Sanctuary & Prison"];
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(initial),
    );
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const skip = page.getByRole("button", { name: "Skip reward" });
    await skip.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await skip.click();
    await expect(
      page.getByRole("heading", { name: fight === 0 ? "Choose a path" : "A moment of rest" }),
    ).toBeInViewport();
    await expect(page.getByRole("button", { name: "The Oathless Seraph, HP 28/30" })).toBeInViewport();
    if (fight === 0) await expect(page.getByRole("button", { name: /^Combat:/ })).toBeInViewport();
    else await expect(page.getByRole("button", { name: "Heal 2 HP" })).toBeInViewport();
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test("Mirror Exchange previews, cancels, resumes and swaps one chosen card", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      31,
      { id: "exchange-ui", tier: 1, orientation: "light", relic: "hollow-chalice" },
      "thorn-witch",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  initial.state.player.hp = 17;
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.event = "exchange";
  route.state.experiment!.lastEvent = "exchange";
  const incoming = route.state.experiment!.route!.pair;
  const outgoing = route.state.deck[0]!;
  const saved = encodeRun(route);
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, saved);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const event = page.getByRole("button", { name: `Event: exchange a card for ${incoming}` });
  await event.hover();
  await expect(page.getByRole("tooltip")).toContainText("Exchange a card in your deck for this pair.");
  await page.keyboard.press("Tab");
  await event.focus();
  await event.press("Enter");
  await expect(page.getByRole("heading", { name: "Mirror Exchange", exact: true })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Receive" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Give" })).toBeVisible();
  await expect(page.getByRole("button", { name: `The Thorn Witch, HP 17/30` })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.experiment?.route
            ?.selecting,
      ),
    )
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Mirror Exchange", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to paths" }).click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deck 10" })).toBeVisible();
  await page.getByRole("button", { name: `Event: exchange a card for ${incoming}` }).click();
  const give = page.getByRole("button", { name: `Exchange ${outgoing.pair} for ${incoming}` }).first();
  await give.click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "17");
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.fight,
      ),
    )
    .toBe(1);
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state.run,
  );
  expect(state.deck).toHaveLength(route.state.deck.length);
  expect(state.deck.some((card: { id: string }) => card.id === outgoing.id)).toBe(false);
  expect(state.deck.filter((card: { pair: string }) => card.pair === incoming)).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "17");
});

test("touch inspects an exchange card without trading until tapped", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const snapshot = structuredClone(
    createRun(31, { id: "exchange-touch", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  snapshot.state.phase = "reward";
  snapshot.state.offers = [];
  const game = restoreSession(snapshot, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.event = "exchange";
  route.state.experiment!.route!.selecting = true;
  const incoming = route.state.experiment!.route!.pair;
  const outgoing = route.state.deck[0]!;
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), encodeRun(route));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).tap();
  await page.getByRole("button", { name: "Continue run" }).tap();
  const card = page.getByRole("button", { name: `Exchange ${outgoing.pair} for ${incoming}` }).first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await page.waitForTimeout(600);
  await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("heading", { name: "Mirror Exchange", exact: true })).toBeVisible();
  await card.tap();
  await expect(page.locator(".battle-player")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.fight,
      ),
    )
    .toBe(1);
  await context.close();
});

test("route previews become collection discoveries without revealing future encounters", async ({ page }) => {
  const candidates = new Set(["Cherub & Imp", "Winged Guardian & Revenant"]);
  let route: ReturnType<ReturnType<typeof createRun>["getSnapshot"]> | undefined;
  for (let seed = 0; seed < 800; seed++) {
    const initial = structuredClone(
      createRun(
        seed,
        { id: `discovery-${seed}`, tier: 3, orientation: "light", relic: "none" },
        "oathless-seraph",
      ).getSnapshot(),
    );
    initial.state.phase = "reward";
    initial.state.offers = [];
    const game = restoreSession(initial, runHandler);
    game.dispatch({ type: "reward", pair: null });
    const state = game.getSnapshot().state;
    if (
      candidates.has(state.experiment!.route!.pair) &&
      state.experiment!.route!.event !== "sanctuary" &&
      state.encounters![1] !== "crowned-sun"
    ) {
      route = structuredClone(game.getSnapshot());
      break;
    }
  }
  expect(route).toBeDefined();
  const path = route!.state.experiment!.route!;
  const light = cards[path.pair]!.light.name;
  const dark = cards[path.pair]!.dark.name;
  const hiddenEnemy = route!.state.encounters![1]!;
  const saved = encodeRun(route!);
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]")),
    )
    .toEqual(expect.arrayContaining([`card:${light}`, `card:${dark}`, `enemy:${path.enemy}`]));
  const discovered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]"),
  );
  expect(discovered).not.toContain(`enemy:${hiddenEnemy}`);
  expect(await page.evaluate(() => localStorage.getItem("dusk-and-dawn.save.v1"))).toBe(saved);
  await page.reload();
  await page.getByRole("button", { name: "Collection" }).click();
  await expect(page.getByRole("img", { name: light, exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: dark, exact: true })).toBeVisible();
});

test("resuming an exchange does not reveal a route enemy that is not on screen", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      30,
      { id: "exchange-discovery", tier: 3, orientation: "light", relic: "none" },
      "oathless-seraph",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.event = "exchange";
  route.state.experiment!.route!.selecting = true;
  const path = route.state.experiment!.route!;
  const light = cards[path.pair]!.light.name;
  const dark = cards[path.pair]!.dark.name;
  expect(path.enemy).not.toBe("crowned-sun");
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), encodeRun(route));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Mirror Exchange", exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]")),
    )
    .toEqual(expect.arrayContaining([`card:${light}`, `card:${dark}`]));
  const discovered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]"),
  );
  expect(discovered).not.toContain(`enemy:${path.enemy}`);
});

for (const condition of ["active", "hush", "freeze", "curse", "zero"] as const) {
  test(`ward-bypassing intent reflects ${condition} and matches combat`, async ({ page }) => {
    const snapshot = structuredClone(createRun(42).getSnapshot());
    snapshot.state.encounters![0] = "sunbleached-harlequin";
    snapshot.state.enemy.hp = 24;
    snapshot.state.enemy.maxHp = 24;
    snapshot.state.action = 1;
    snapshot.state.player.ward = 10;
    if (condition === "hush") snapshot.state.enemy.hush = true;
    if (condition === "freeze") snapshot.state.enemy.freeze = true;
    if (condition === "curse") snapshot.state.enemy.curse = 4;
    if (condition === "zero") snapshot.state.enemy.curse = 5;
    await page.addInitScript(
      (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
      encodeRun(snapshot),
    );
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto("/");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Continue run" }).click();
    const text =
      condition === "active"
        ? "5 Release · 3 through Ward"
        : condition === "hush"
          ? "5 Release"
          : condition === "freeze"
            ? "Skipped"
            : condition === "zero"
              ? "0 Release"
              : "1 Release · 1 through Ward";
    const intent = page.getByRole("button", { name: `Sunbleached Harlequin intent: ${text}`, exact: true });
    await expect(intent).toBeVisible();
    const overlaps = await intent.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return [...document.querySelectorAll(".battle-card, .battle-actions button")].some((other) => {
        const box = other.getBoundingClientRect();
        return (
          bounds.left < box.right &&
          bounds.right > box.left &&
          bounds.top < box.bottom &&
          bounds.bottom > box.top
        );
      });
    });
    expect(overlaps).toBe(false);
    await page.getByRole("button", { name: "End turn" }).click();
    await expect(page.locator(".battle-player")).toHaveAttribute(
      "data-player-hp",
      condition === "active" ? "27" : condition === "curse" ? "29" : "30",
    );
    await expect(page.locator(".battle-player")).toHaveAttribute(
      "data-ward",
      condition === "active" ? "4" : condition === "hush" ? "2" : "5",
    );
  });
}

test("an all-Ward bypass reports the full hit and ignores the shield", async ({ page }) => {
  const snapshot = structuredClone(createRun(42).getSnapshot());
  snapshot.state.encounters![0] = "the-sable-locksmith";
  snapshot.state.enemy.hp = 24;
  snapshot.state.enemy.maxHp = 24;
  snapshot.state.action = 1;
  snapshot.state.player.ward = 10;
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(
    page.getByRole("button", { name: "The Sable Locksmith intent: 5 Binding · 5 through Ward" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "25");
  await expect(page.locator(".battle-player")).toHaveAttribute("data-ward", "5");
});

test("Sunken Sanctuary previews healing versus mana without revealing or adding a card", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      31,
      { id: "sanctuary-ui", tier: 1, orientation: "light", relic: "none" },
      "oathless-seraph",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  initial.state.player.hp = 20;
  initial.state.encounters![1] = "fixture:0";
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.event = "sanctuary";
  route.state.experiment!.route!.pair = "Cherub & Imp";
  route.state.experiment!.lastEvent = "sanctuary";
  const saved = encodeRun(route);
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, saved);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: "The Oathless Seraph, HP 20/30" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rest: heal 4 HP" })).toBeVisible();
  const shrine = page.getByRole("button", { name: "Event: heal 7 HP, start next fight with 2 mana" });
  await expect(shrine).toContainText("Sunken Sanctuary · +7 HP · −1 mana");
  await shrine.hover();
  await expect(page.getByRole("tooltip")).toContainText("Heal 7 HP. Start the next fight with 2 mana.");
  const discovered = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dusk-and-dawn.collection.v1") || "[]"),
  );
  expect(discovered).not.toContain("card:Cherub");
  expect(discovered).not.toContain("card:Imp");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Event: heal 7 HP, start next fight with 2 mana" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-player-hp", "27");
  await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", "2");
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state?.run?.fight,
      ),
    )
    .toBe(1);
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1") || "{}").state.run,
  );
  expect(after.deck).toEqual(route.state.deck);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", "2");
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.locator(".battle-player")).toHaveAttribute("data-mana", "3");
});

test("deck focus overrides a stationary pointer inspecting another pair", async ({ page }) => {
  const snapshot = structuredClone(createRun(22).getSnapshot());
  snapshot.state.phase = "reward";
  snapshot.state.offers = ["Sanctuary & Prison"];
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(snapshot),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: "Deck 10", exact: true }).click();
  const deck = page.getByRole("dialog", { name: "Deck · 10" });
  const angel = deck.getByRole("button", { name: /^Angel & Vampire, 2 copies/ });
  const sun = deck.getByRole("button", { name: /^Sun & Moon, 2 copies/ });
  await page.keyboard.press("Shift+Tab");
  await sun.hover();
  await expect(page.getByRole("tooltip")).toContainText("Deal 6 Radiance damage");
  await deck.locator(".battle-deck-pair button").nth(3).focus();
  await expect(page.getByRole("tooltip")).toContainText("Apply 3 Burn");
  await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"][aria-labelledby]')!;
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>(".battle-deck-pair button")];
    buttons[1]!.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
    buttons[0]!.focus();
  });
  await expect(angel).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveCount(1);
  await expect(page.getByRole("tooltip")).toContainText("Gain 5 Ward");
  await expect(page.getByRole("tooltip")).toContainText("Deal 3 Shadow damage");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(deck).toBeVisible();
  await page.mouse.move(5, 5);
  await sun.hover();
  await expect(page.getByRole("tooltip")).toContainText("Deal 6 Radiance damage");
  await page.keyboard.press("Tab");
  await expect(sun).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Deal 6 Radiance damage");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("route inspection leaves the deck action visible on desktop", async ({ page }) => {
  const initial = structuredClone(
    createRun(31, { id: "route-tooltip", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  await page.addInitScript(
    (data) => localStorage.setItem("dusk-and-dawn.save.v1", data),
    encodeRun(game.getSnapshot()),
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const rest = page.getByRole("button", { name: /^Rest: heal/ });
  const deck = page.getByRole("button", { name: /^Deck / });
  await rest.hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Heal 0 HP");
  await expect
    .poll(async () => {
      const [a, b] = await Promise.all([tip.boundingBox(), deck.boundingBox()]);
      if (!a || !b) return true;
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    })
    .toBe(false);
  await deck.click();
  await expect(page.getByRole("dialog", { name: /^Deck/ })).toBeVisible();
});

test("route enemy inspection shows its trait once without losing the action pattern", async ({ page }) => {
  const initial = structuredClone(
    createRun(31, { id: "route-pattern", tier: 1, orientation: "light", relic: "none" }).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = [];
  const game = restoreSession(initial, runHandler);
  game.dispatch({ type: "reward", pair: null });
  const route = structuredClone(game.getSnapshot());
  route.state.experiment!.route!.enemy = "the-thorned-librarian";
  await page.addInitScript((data) => localStorage.setItem("dusk-and-dawn.save.v1", data), encodeRun(route));
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /^Combat: The Thorned Librarian/ }).hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Thorn Page: Deal 5 Binding damage.");
  await expect(tip).toContainText("Open the Brambles: Deal 4 Binding damage.");
  await expect(tip).toContainText("After each of the player's direct attack cards");
  expect((await tip.innerText()).match(/After each of the player's direct attack cards/g)).toHaveLength(1);
  await expect(tip).toBeInViewport({ ratio: 1 });
});

test("revised reward pairs show both effects and preserve a chosen pair across reload", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      31,
      { id: "retuned-reward", tier: 1, orientation: "light", relic: "none" },
      "thorn-witch",
    ).getSnapshot(),
  );
  initial.state.phase = "reward";
  initial.state.offers = ["Wax Seal & Torn Letter", "Wooden Spool & Loose Thread", "Dove & Raven"];
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(initial));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  const wax = page.getByRole("button", { name: /^Wax Seal & Torn Letter/ });
  await wax.hover();
  await expect(page.getByRole("tooltip")).toContainText("Gain 7 Ward. Banish this card.");
  await expect(page.getByRole("tooltip")).toContainText("Draw 2 cards. Banish this card.");
  const spool = page.getByRole("button", { name: /^Wooden Spool & Loose Thread/ });
  await spool.hover();
  await expect(page.getByRole("tooltip")).toContainText("Keep your hand.");
  await expect(page.getByRole("tooltip")).toContainText("Flip your hand.");
  await spool.click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.phase),
    )
    .toBe("route");
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /^Deck / }).click();
  const deck = page.getByRole("dialog", { name: /^Deck/ });
  await expect(deck.getByRole("button", { name: /^Wooden Spool & Loose Thread/ })).toBeVisible();
});

test("Wax Seal plays directly and its one-shot Ward survives a reload", async ({ page }) => {
  const initial = structuredClone(
    createRun(
      31,
      { id: "wax-combat", tier: 1, orientation: "light", relic: "none" },
      "thorn-witch",
    ).getSnapshot(),
  );
  const card = initial.state.deck[0]!;
  card.pair = "Wax Seal & Torn Letter";
  const zoneCard = [...initial.state.zones.hand, ...initial.state.zones.library].find(
    (item) => item.id === card.id,
  )!;
  initial.state.zones.hand = initial.state.zones.hand.filter((item) => item.id !== card.id);
  initial.state.zones.library = initial.state.zones.library.filter((item) => item.id !== card.id);
  initial.state.zones.hand.push({ ...zoneCard, pair: card.pair, face: "light", kept: false });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, encodeRun(initial));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await page.getByRole("button", { name: /^Wax Seal light/ }).click();
  await expect(page.getByRole("button", { name: /Player status: ward 7/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Banished 1/ })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("dusk-and-dawn.save.v1")!).state.run.player.ward),
    )
    .toBe(7);
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("button", { name: /Player status: ward 7/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Banished 1/ })).toBeVisible();
});
