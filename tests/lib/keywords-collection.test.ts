import { expect, it } from "vitest";
import { collectionItems, sampleCatalog } from "../../src/lib/collection/catalog";
import {
  keywordColors,
  keywordPlasma,
  neutralShine,
  splitKeywordText,
} from "../../src/lib/keywords/keywords";

it("derives presentation colors from one replaceable keyword catalog", () => {
  expect(keywordPlasma(["sample-a", "sample-b"])).toEqual({ primary: "#8dd9cb", secondary: "#b8a0eb" });
  expect(keywordColors(["sample-a", "sample-b", "sample-a"])).toEqual(["#8dd9cb", "#b8a0eb", "#8dd9cb"]);
  expect(keywordColors(["unknown"])).toEqual(neutralShine);
  expect(keywordPlasma(["unknown"])).toBeNull();
});

it("highlights complete labels and keeps overlapping labels distinct", () => {
  expect(
    splitKeywordText("Sample Keyword A, Sample Keyword AB, and Sample Keyword Axe.", [
      { id: "a", label: "Sample Keyword A" },
      { id: "ab", label: "Sample Keyword AB" },
    ]),
  ).toEqual([
    { text: "Sample Keyword A", keywordId: "a" },
    { text: ", " },
    { text: "Sample Keyword AB", keywordId: "ab" },
    { text: ", and Sample Keyword Axe." },
  ]);
});

it("maps real discovery identifiers without modifying the catalog", () => {
  const first = sampleCatalog[0]!;
  const next = collectionItems("cards", new Set([first.id]));
  expect(next[0]!.discovered).toBe(true);
  expect(next[1]!.discovered).toBe(false);
  expect(collectionItems("cards", new Set())[0]!.discovered).toBe(false);
  expect("discovered" in first).toBe(false);
});
