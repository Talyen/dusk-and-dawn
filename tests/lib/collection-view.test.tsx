// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CardBrowser } from "../../src/components/browsing/card-browser";
import { localization } from "../../src/lib/localization";
import type { CollectionEntry } from "../../src/lib/collection/catalog";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("masks an entry until its supplied discovery ID is present", () => {
  const entry: CollectionEntry = {
    id: "real-card",
    kind: "cards",
    number: 1,
    titleKey: "playerCardNumber",
    descriptionKey: "placeholderDescription",
    art: "/example.webp",
    keywordIds: [],
  };
  const draw = (ids: ReadonlySet<string>) => (
    <I18nextProvider i18n={localization}>
      <CardBrowser catalog={[entry]} discoveredIds={ids} onInspectChange={() => {}} />
    </I18nextProvider>
  );
  const view = render(draw(new Set()));
  expect(screen.getByRole("img", { name: "Undiscovered card 1" })).toBeTruthy();
  expect(view.container.querySelector("img")).toBeNull();
  fireEvent.pointerEnter(screen.getByRole("img", { name: "Undiscovered card 1" }), { pointerType: "mouse" });
  expect(screen.getByRole("tooltip").textContent).toContain("Discover this entry");
  expect(screen.getByRole("tooltip").textContent).not.toContain("Placeholder card description");
  view.rerender(draw(new Set([entry.id])));
  expect(screen.getByRole("img", { name: "Player card 1" })).toBeTruthy();
  expect(view.container.querySelector("img")?.getAttribute("src")).toBe("/example.webp");
  expect(screen.getByRole("tooltip").textContent).toContain("Placeholder card description");
});
