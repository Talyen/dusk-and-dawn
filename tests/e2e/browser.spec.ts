import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("opens the prototype in a browser", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Dusk & Dawn");
  await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
  await expect(page.getByText("Prototype foundation")).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
