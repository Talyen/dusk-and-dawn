import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("browses both card shapes by hover or keyboard without click inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play" })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("button", { name: "Play" }).hover();
  await expect(page.getByRole("button", { name: "Play" })).toHaveAccessibleDescription(
    "Play will be available when the game is ready.",
  );
  await page.getByRole("button", { name: "Collection" }).click();
  const card = page.getByRole("img", { name: "Player card 1" });
  await expect(page.locator(".card-grid-item p")).toHaveCount(0);
  await expect(page.locator(".screen-header .eyebrow")).toHaveCount(0);
  const portrait = (await card.boundingBox())!;
  expect(portrait.width / portrait.height).toBeCloseTo(3 / 4, 2);
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Placeholder description featuring Sample Keyword A.");
  await expect(card).toHaveAttribute("aria-describedby", (await tooltip.getAttribute("id"))!);
  await card.click();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).not.toHaveAttribute("aria-pressed");
  await page.mouse.move(10, 10);
  await expect(tooltip).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("img", { name: "Player card 2" })).toBeFocused();
  await expect(tooltip).toContainText("Player card 2");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("img", { name: "Player card 3" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(page.getByRole("heading", { name: "Collection" })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("img", { name: "Undiscovered card 9" })).toBeVisible();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await page.getByRole("button", { name: "Enemies" }).click();
  const enemy = page.getByRole("img", { name: "Enemy card 1" });
  const landscape = (await enemy.boundingBox())!;
  expect(landscape.width / landscape.height).toBeCloseTo(4 / 3, 2);
  await expect(page.getByText("1 / 2")).toBeVisible();
  await page.getByRole("button", { name: "Cards" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
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
  const card = page.getByRole("img", { name: "Player card 1" });
  const width = (await card.boundingBox())!.width;
  await card.hover();
  const tooltipSize = await page
    .getByRole("tooltip")
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(tooltipSize).toBeCloseTo(16 * 1.2 * 1.25, 1);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => (await card.boundingBox())!.width / width).toBeCloseTo(1.36, 1);
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
  const card = page.getByRole("img", { name: "Player card 1" });
  await card.evaluate((element) =>
    Object.assign(element.parentElement!.style, { position: "fixed", top: "1px", left: "1px", zIndex: "2" }),
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
  await page.getByRole("img", { name: "Player card 4" }).focus();
  const card = page.getByRole("img", { name: "Player card 4" });
  await expect(card).toBeFocused();
  await page.locator(".card-grid-shell").evaluate((element) => {
    (element as HTMLElement).style.width = "150px";
  });
  await expect(page.getByText("2 / 6")).toBeVisible();
  await expect(card).toBeFocused();
  await expect(page.getByRole("tooltip")).toContainText("Player card 4");
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
  const first = page.getByRole("img", { name: "Player card 1" });
  await first.hover();
  await expect(glow).toHaveAttribute("data-primary", "#8dd9cb");
  await expect(first.locator(".shine-border stop").first()).toHaveAttribute("stop-color", "#8dd9cb");
  await expect(first.locator(".shine-border stop").first()).toHaveCSS("animation-name", "border-color-shine");
  await expect(page.getByRole("tooltip").locator(".shine-text")).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { particleColors: string[] }).particleColors.includes("#8dd9cb"),
      ),
    )
    .toBe(true);
  await page.getByRole("img", { name: "Player card 2" }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#b8a0eb");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { particleColors: string[] }).particleColors.includes("#b8a0eb"),
      ),
    )
    .toBe(true);
  await page.getByRole("img", { name: "Player card 3" }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#8dd9cb");
  await expect(glow).toHaveAttribute("data-secondary", "#b8a0eb");
  await expect(page.getByRole("tooltip").locator(".shine-text")).toHaveCount(3);
  await page.getByRole("img", { name: "Player card 4" }).hover();
  await expect(glow).toHaveAttribute("data-primary", "#e8be86");
  const locked = page.getByRole("img", { name: "Undiscovered card 6" });
  await locked.hover();
  await expect(locked).toHaveAttribute("data-discovered", "false");
  await expect(locked.locator(".shine-border stop").first()).toHaveAttribute("stop-color", "#8dd9cb");
  await expect(page.getByRole("tooltip")).toContainText("Discover this entry to reveal its details.");
  await expect(page.getByRole("tooltip")).not.toContainText("Sample Keyword");
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
  await page.getByRole("img", { name: "Player card 2" }).hover();
  const fallback = page.getByTestId("plasma-fallback");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("style", /rgb\(184, 160, 235\)/);
  await expect(page.getByTestId("plasma-canvas")).toBeHidden();
});

test("screen chrome menu preserves collection history and contains keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.locator(".intro .eyebrow")).toHaveCount(0);
  await page.getByRole("button", { name: "Collection" }).click();
  await expect(page.locator(".screen-header")).toContainText("Collection");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
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
  await expect(page.getByText("2 / 2")).toBeVisible();
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
