// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { localization } from "../src/lib/localization";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  void localization.changeLanguage("en");
});
it("renders translated content and falls back to English", async () => {
  await localization.changeLanguage("en-XA");
  render(
    <I18nextProvider i18n={localization}>
      <App />
    </I18nextProvider>,
  );
  expect(screen.getByRole("heading", { name: "Dusk & Dawn" })).toBeTruthy();
  fireEvent.pointerEnter(screen.getByRole("button", { name: "[Plaaay]" }), { pointerType: "mouse" });
  expect(screen.getByText("[Plaaay wiiill beee avaaailaaable wheeen the gaaame is reaaady.]")).toBeTruthy();
  expect(localization.t("missing", { defaultValue: "Fallback" })).toBe("Fallback");
});
