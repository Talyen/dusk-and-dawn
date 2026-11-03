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
