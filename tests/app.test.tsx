// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it } from "vitest";
import { App } from "../src/App";
import { localization } from "../src/lib/localization";

afterEach(() => {
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
  expect(screen.getByText("[Prooototype fouuundation]")).toBeTruthy();
  expect(localization.t("missing", { defaultValue: "Fallback" })).toBe("Fallback");
});
