import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("navigates options and retains preferences", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Dusk & Dawn");
  await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("heading", { name: "Options" })).toBeFocused();
  await page.getByRole("slider", { name: "Music" }).fill("35");
  await page.getByRole("switch", { name: "Reduce motion" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Options" })).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("slider", { name: "Music" })).toHaveValue("35");
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toBeChecked();
});

test("inspects both placeholder card shapes with pointer and keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Card preview" }).click();
  const player = page.getByRole("button", { name: "Player card" });
  const enemy = page.getByRole("button", { name: "Enemy card" });
  const portrait = await player.boundingBox();
  const landscape = await enemy.boundingBox();
  expect(portrait!.width / portrait!.height).toBeCloseTo(3 / 4, 2);
  expect(landscape!.width / landscape!.height).toBeCloseTo(4 / 3, 2);
  await player.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Placeholder card description.");
  await expect(player).toHaveAttribute("aria-describedby", (await tooltip.getAttribute("id")) as string);
  await player.click();
  await expect(player).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(10, 10);
  await expect(tooltip).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(enemy).toBeFocused();
  await expect(tooltip).toContainText("Enemy card");
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expect(page.getByRole("heading", { name: "Card preview" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Card preview" })).toBeFocused();
});

test("game size scales the interface and persists", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Card preview" }).click();
  const initial = (await page.getByRole("button", { name: "Player card" }).boundingBox())!.width;
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Options" }).click();
  await page.getByRole("slider", { name: "Game size" }).fill("120");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Card preview" }).click();
  const enlarged = (await page.getByRole("button", { name: "Player card" }).boundingBox())!.width;
  expect(enlarged / initial).toBeCloseTo(1.2, 2);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect
    .poll(
      async () => (await page.getByRole("button", { name: "Player card" }).boundingBox())!.width / enlarged,
    )
    .toBeCloseTo(1.36, 2);
  await page.reload();
  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("slider", { name: "Game size" })).toHaveValue("120");
});

test("keeps tooltips in the viewport and dismisses them on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");
  await page.getByRole("button", { name: "Card preview" }).click();
  const card = page.getByRole("button", { name: "Player card" });
  await card.evaluate((element) => {
    const wrap = element.parentElement!;
    Object.assign(wrap.style, { position: "fixed", top: "1px", left: "1px", zIndex: "2" });
  });
  await card.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toHaveAttribute("data-side", /^(bottom|right)$/);
  const box = (await tooltip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(800);
  expect(box.y + box.height).toBeLessThanOrEqual(600);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.mouse.wheel(0, 100);
  await expect(tooltip).toBeHidden();
  await expect(card).not.toHaveAttribute("aria-describedby");
});
