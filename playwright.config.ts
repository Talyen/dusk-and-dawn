import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173" },
  projects: [
    { name: "chromium", testMatch: "browser.spec.ts", use: { browserName: "chromium" } },
    { name: "electron", testMatch: "desktop.spec.ts" },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
