import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createRun, runHandler } from "../../src/lib/game/run";
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

test("a player can inspect and play a card, then end the turn", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "End turn" })).toBeInViewport();
  const card = page.locator(".battle-card").first();
  await expect(card.locator("img")).toHaveJSProperty("complete", true);
  expect(await card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(/Current attack:.*Radiance damage before Ward and Reflect/)).toBeVisible();
  await card.click();
  await expect(page.getByText(/Other face:/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Play / })).toBeInViewport();
  await page.getByRole("button", { name: /^Play / }).click();
  await expect(page.getByText("Mana 2/3", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByText("Mana 3/3", { exact: false })).toBeVisible();
  await page.screenshot({ path: "/tmp/dusk-dawn-battle.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("a run can be resumed after reloading", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
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
  await expect(page.getByText(/Next: Open-Wing Dust/)).toBeVisible();
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
  await page.getByRole("button", { name: /Wilderness dark/ }).click();
  await expect(page.getByLabel("Committed inspection")).toHaveCount(0);
  await page.getByRole("button", { name: "Play Wilderness" }).click();
  await expect(page.getByLabel("Committed inspection")).toBeVisible();
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
  await panel.getByRole("button", { name: /^Flame —/ }).click();
  await panel.getByRole("button", { name: "Confirm choice" }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Flame light/ })).toBeVisible();
  await expect(page.getByText(/Mana 2\/3/)).toBeVisible();
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
  await page.getByRole("button", { name: "Start new run" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  const encountered = new Set<string>();
  for (let step = 0; step < 300; step++) {
    const title = (await page.locator("#battle-title").innerText()).trim();
    if (title === "Victory") break;
    if (title === "Run ended") throw new Error(`Seeded browser run ended in defeat after ${step} decisions`);
    if (title === "Choose a reward") {
      await page.getByRole("button", { name: "Skip reward" }).click();
      continue;
    }
    if (title === "A moment of rest") {
      await page.getByRole("button", { name: "Heal 6 HP" }).click();
      continue;
    }
    encountered.add(title);
    const player = page.locator(".battle-board .battle-panel").first();
    const enemy = page.locator(".battle-enemy");
    const playerStats = await player.locator("p").first().innerText();
    const playerStatus = await player.locator("p").nth(1).innerText();
    const enemyStatus = await enemy.locator("p").nth(1).innerText();
    const hp = Number(/HP\s*(\d+)/.exec(playerStats)?.[1]);
    const mana = Number(/Mana\s*(\d+)/.exec(playerStats)?.[1]);
    const ward = Number(/ward\s+(\d+)/i.exec(playerStatus)?.[1] ?? 0);
    const burn = Number(/burn\s+(\d+)/i.exec(enemyStatus)?.[1] ?? 0);
    const curse = Number(/curse\s+(\d+)/i.exec(enemyStatus)?.[1] ?? 0);
    const priority: Record<string, number> = {
      Sun: 20,
      Vampire: 19,
      Wither: 18,
      Flame: burn < 3 ? 16 : 1,
      Angel: ward < 5 ? 12 : 2,
      Frost: curse < 2 ? 11 : 1,
      Key: 10,
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
    await page.getByRole("button", { name: /^Play / }).click();
  }
  await expect(page.getByRole("heading", { name: "Victory", exact: true })).toBeVisible();
  expect(encountered.size).toBe(5);
  expect(errors).toEqual([]);
});

test("encountered enemies remain discovered in the real collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
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
  await page.getByRole("button", { name: /Memory light/ }).click();
  await expect(page.getByText("Automatic target: Moon.")).toBeVisible();
  await expect(page.getByText("Choose a card from your discard pile.")).toHaveCount(0);
  await page.getByRole("button", { name: "Play Memory" }).click();
  await expect(page.getByRole("button", { name: /Moon dark/ })).toBeVisible();
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
  await page.getByRole("button", { name: /Water Clock dark/ }).click();
  await expect(
    page.getByText("Drawing will fill your hand, so this card cannot return to it with Keep."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play Water Clock" }).click();
  await expect(page.getByRole("button", { name: /Water Clock dark/ })).toHaveCount(0);
  await expect(page.locator(".battle-card")).toHaveCount(8);
});

test("battle actions stay usable on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
  await expect(page.getByRole("button", { name: "End turn" })).toBeInViewport();
  await page.locator(".battle-card").first().click();
  const play = page.getByRole("button", { name: /^Play / });
  await expect(play).toBeInViewport();
  await play.click();
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
  const route = game.getSnapshot().state.experiment!.route!;
  const saved = encodeRun(game.getSnapshot());
  await page.addInitScript((data) => {
    if (!localStorage.getItem("dusk-and-dawn.save.v1")) localStorage.setItem("dusk-and-dawn.save.v1", data);
  }, saved);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Continue run" }).click();
  await expect(page.getByRole("heading", { name: "Choose a path" })).toBeVisible();
  await expect(page.getByText(`Event pair:`, { exact: false })).toContainText(route.pair.split(" & ")[0]!);
  await page.getByRole("button", { name: /^Event: lose 4 HP/ }).click();
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
  await page.getByRole("button", { name: "Return to main menu" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await expect(page.getByText(/Pool tier 2\/3/)).toBeVisible();
  await page.getByLabel("Starting orientation").selectOption("dark");
  await page.getByLabel("Run relic").selectOption("cracked-vessel");
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByText(/HP 24\/30/)).toBeVisible();
  await expect(page.locator(".battle-card").first()).toContainText("dark");
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
  await page.getByRole("button", { name: "Configure expedition" }).click();
  await page.getByLabel("Run relic").selectOption("many-eyes");
  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("heading", { name: "Radiant Moth", exact: true })).toBeVisible();
  const encountered = new Set<string>();
  let branches = 0;
  for (let step = 0; step < 300; step++) {
    const title = (await page.locator("#battle-title").innerText()).trim();
    if (title === "Victory") break;
    if (title === "Run ended") throw new Error(`Seeded browser run ended in defeat after ${step} decisions`);
    if (title === "Choose a path") {
      branches++;
      await page.getByRole("button", { name: branches === 1 ? /^Combat:/ : /^Rest: heal 4/ }).click();
      continue;
    }
    if (title === "Choose a reward") {
      await page.getByRole("button", { name: "Skip reward" }).click();
      continue;
    }
    if (title === "A moment of rest") {
      await page.getByRole("button", { name: "Heal 6 HP" }).click();
      continue;
    }
    encountered.add(title);
    const player = page.locator(".battle-board .battle-panel").first();
    const enemy = page.locator(".battle-enemy");
    const playerStats = await player.locator("p").first().innerText();
    const playerStatus = await player.locator("p").nth(1).innerText();
    const enemyStatus = await enemy.locator("p").nth(1).innerText();
    const hp = Number(/HP\s*(\d+)/.exec(playerStats)?.[1]);
    const mana = Number(/Mana\s*(\d+)/.exec(playerStats)?.[1]);
    const ward = Number(/ward\s+(\d+)/i.exec(playerStatus)?.[1] ?? 0);
    const burn = Number(/burn\s+(\d+)/i.exec(enemyStatus)?.[1] ?? 0);
    const curse = Number(/curse\s+(\d+)/i.exec(enemyStatus)?.[1] ?? 0);
    const priority: Record<string, number> = {
      Sun: 20,
      Vampire: 19,
      Wither: 18,
      Flame: burn < 3 ? 16 : 1,
      Angel: ward < 5 ? 12 : 2,
      Frost: curse < 2 ? 11 : 1,
      Key: 10,
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
    await page.getByRole("button", { name: /^Play / }).click();
  }
  await expect(page.getByRole("heading", { name: "Victory", exact: true })).toBeVisible();
  expect(encountered.size).toBe(6);
  expect(branches).toBe(2);
  expect(errors).toEqual([]);
});

test("inspects battle cards on hover and keyboard focus without selecting them", async ({ page }) => {
  const seed = Array.from({ length: 20 }, (_, index) => index).find((value) =>
    createRun(value)
      .getSnapshot()
      .state.zones.hand.some((card) => card.pair === "Angel & Vampire"),
  )!;
  await page.addInitScript((value) => {
    Math.random = () => value / 0x100000000;
  }, seed);
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start new run" }).click();
  await expect(page.getByRole("progressbar", { name: "Radiant Moth health" })).toHaveAttribute("value", "18");
  await page.getByText("Inspect full pattern").click();
  await expect(page.getByText("Deal 4 Radiance damage.", { exact: false }).first()).toBeVisible();
  const card = page.locator(".battle-card").filter({ hasText: "Angel" }).first();
  await card.hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Absorbs damage");
  await expect(card).toHaveAttribute("aria-pressed", "false");
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
  await page.getByText("Inspect full pattern").click();
  await expect(page.locator(".battle-enemy details li")).toHaveCount(3);
  await expect(page.locator(".battle-enemy details li").filter({ hasText: "Bitter Goblet" })).toHaveCount(2);
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
  await expect(page.getByText(/Held-card hazard pool if you end turn now:/)).toBeVisible();
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
