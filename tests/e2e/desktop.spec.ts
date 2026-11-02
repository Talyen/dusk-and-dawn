import { _electron as electron, expect, test } from "@playwright/test";

test("opens the built renderer in an isolated Electron window", async () => {
  const executablePath = process.env.DUSK_ELECTRON_EXECUTABLE;
  const app = await electron.launch({
    ...(executablePath ? { executablePath, args: [] } : { args: ["."] }),
    env: { ...process.env, DUSK_DEV_URL: "" },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
    expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe("undefined");
    expect(await page.evaluate(() => typeof (globalThis as { process?: unknown }).process)).toBe("undefined");
  } finally {
    await app.close();
  }
});

test("opens the development renderer in Electron", async () => {
  test.skip(Boolean(process.env.DUSK_ELECTRON_EXECUTABLE), "Packaged applications use the built renderer");
  const app = await electron.launch({
    args: ["."],
    env: { ...process.env, DUSK_DEV_URL: "http://127.0.0.1:5173" },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole("heading", { name: "Dusk & Dawn" })).toBeVisible();
  } finally {
    await app.close();
  }
});
