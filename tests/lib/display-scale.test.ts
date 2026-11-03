import { expect, it } from "vitest";
import { getUiScale } from "../../src/lib/display/scale";

it("fits the 16:9 anchor, grows large windows at 72%, and applies game size", () => {
  expect(getUiScale(1280, 720, 100)).toBe(1);
  expect(getUiScale(640, 720, 100)).toBe(0.5);
  expect(getUiScale(2560, 1440, 100)).toBe(1.72);
  expect(getUiScale(1280, 720, 80)).toBe(0.8);
  expect(getUiScale(1280, 720, 120)).toBe(1.2);
});
