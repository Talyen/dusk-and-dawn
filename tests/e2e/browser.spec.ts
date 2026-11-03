import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("browses both card shapes by hover or keyboard without click inspection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: "Play" })).toHaveAccessibleDescription(
    "Play will be available when the game is ready.",
  );
  await page.getByRole("button", { name: "Card preview" }).click();
  const card = page.getByRole("img", { name: "Player card 1" });
  const portrait = (await card.boundingBox())!;
  expect(portrait.width / portrait.height).toBeCloseTo(3 / 4, 2);
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Placeholder card description.");
  await expect(card).toHaveAttribute("aria-describedby", (await tooltip.getAttribute("id"))!);
  await card.click();
  await expect(page.getByRole("heading", { name: "Card preview" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Card preview" })).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("img", { name: "Player card 9" })).toBeVisible();
  await expect(page.getByText("2 / 2")).toBeVisible();
  await page.getByRole("button", { name: "Enemy cards" }).click();
  const enemy = page.getByRole("img", { name: "Enemy card 1" });
  const landscape = (await enemy.boundingBox())!;
  expect(landscape.width / landscape.height).toBeCloseTo(4 / 3, 2);
  await expect(page.getByText("1 / 2")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("display and audio preferences persist and scale independently", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("slider", { name: "Music" }).fill("35");
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
  await page.getByRole("button", { name: "Card preview" }).click();
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
  await expect(page.getByRole("slider", { name: "Music" })).toHaveValue("35");
  await expect(page.getByRole("slider", { name: "Game size" })).toHaveValue("120");
  await expect(page.getByRole("slider", { name: "Tooltip size" })).toHaveValue("125");
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toBeChecked();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("flips tooltips at the viewport edge and dismisses on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");
  await page.getByRole("button", { name: "Card preview" }).click();
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
  await expect(page.getByRole("button", { name: "Card preview" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Card preview" })).toBeFocused();
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
  await expect(page.getByRole("button", { name: "Card preview" })).toBeFocused();
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
