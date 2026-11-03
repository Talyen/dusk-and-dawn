// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { applySettings, defaultSettings, readSettings, saveSettings } from "../../src/lib/settings/settings";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.reducedMotion;
});

it("validates persisted preferences independently and applies motion", () => {
  localStorage.setItem(
    "dusk-and-dawn.settings.v1",
    JSON.stringify({ music: 2, sound: 0.35, reducedMotion: true, gameSizePercent: 127 }),
  );
  expect(readSettings()).toEqual({
    ...defaultSettings,
    sound: 0.35,
    reducedMotion: true,
    gameSizePercent: 120,
  });
  applySettings(readSettings());
  expect(document.documentElement.dataset.reducedMotion).toBe("true");
  expect(saveSettings(defaultSettings)).toBe(true);
  expect(readSettings()).toEqual(defaultSettings);
  localStorage.setItem("dusk-and-dawn.settings.v1", "broken");
  expect(readSettings()).toEqual(defaultSettings);
});
