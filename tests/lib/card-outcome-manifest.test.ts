import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { cards, playtestEffectOverrides } from "../../src/lib/game/run";

type Family = {
  test_file: string;
  test_name: string;
  count: number;
  effect_pattern?: string;
  sentence_patterns?: string[];
};
type Row = {
  pair: string;
  side: "light" | "dark";
  face: string;
  family: string;
  evidence?: { test_file: string; test_name: string; effect: string };
};
type CatalogueFace = { pair: string; side: "light" | "dark"; face: string; effect: string };
type Manifest = { schema_version: number; scope: string; families: Record<string, Family>; faces: Row[] };

function matches(effect: string, family: Family): boolean {
  if (family.effect_pattern) return new RegExp(family.effect_pattern).test(effect);
  if (!family.sentence_patterns) return false;
  const sentences = effect.match(/[^.]+\./g)?.map((sentence) => sentence.trim()) ?? [];
  return (
    sentences.length > 0 &&
    sentences.join(" ") === effect &&
    sentences.every((sentence) =>
      family.sentence_patterns!.some((pattern) => new RegExp(`^(?:${pattern})$`).test(sentence)),
    )
  );
}

it("indexes each distinct reviewed face to one matching, present outcome-test scenario", () => {
  const manifest = JSON.parse(readFileSync("tests/fixtures/card-outcome-coverage.json", "utf8")) as Manifest;
  const catalogue = JSON.parse(
    readFileSync("docs/Dusk & Dawn — Card Effect Catalogue v0.2.json", "utf8"),
  ) as CatalogueFace[];
  expect(manifest.schema_version).toBe(1);
  expect(manifest.scope).toMatch(/not exhaustive/i);
  expect(catalogue).toHaveLength(496);
  expect(manifest.faces).toHaveLength(catalogue.length);
  const key = (entry: { pair: string; side: string }) => `${entry.pair}\0${entry.side}`;
  const manifestByKey = new Map(manifest.faces.map((entry) => [key(entry), entry]));
  expect(manifestByKey.size).toBe(496);
  expect(new Set(manifest.faces.map((entry) => entry.face)).size).toBe(496);
  const counts = new Map<string, number>();
  const testFiles = new Map<string, string>();
  function assertEvidence(path: string, title: string, context: string) {
    expect(path, context).toMatch(/^tests\/lib\/[a-z0-9-]+\.test\.ts$/);
    if (!testFiles.has(path)) testFiles.set(path, readFileSync(path, "utf8"));
    expect(testFiles.get(path), context).toContain(title);
  }
  for (const [id, family] of Object.entries(manifest.families)) {
    expect(Number.isSafeInteger(family.count) && family.count > 0, id).toBe(true);
    assertEvidence(family.test_file, family.test_name, id);
  }
  for (const source of catalogue) {
    const row = manifestByKey.get(key(source));
    expect(row, `${source.pair} ${source.side}`).toBeDefined();
    expect(row!.face).toBe(source.face);
    expect(cards[source.pair]?.[source.side]).toMatchObject({
      name: source.face,
      effect: playtestEffectOverrides[source.face] ?? source.effect,
    });
    const effective = playtestEffectOverrides[source.face] ?? source.effect;
    const matched = Object.entries(manifest.families)
      .filter(([, family]) => matches(effective, family))
      .map(([id]) => id);
    if (row!.family === "bespoke") {
      expect(matched, source.face).toEqual([]);
      expect(row!.evidence, source.face).toBeDefined();
      expect(row!.evidence!.effect, source.face).toBe(effective);
      assertEvidence(row!.evidence!.test_file, row!.evidence!.test_name, source.face);
      expect(testFiles.get(row!.evidence!.test_file), source.face).toContain(source.pair);
    } else {
      expect(row!.evidence, source.face).toBeUndefined();
      expect(matched, source.face).toEqual([row!.family]);
      expect(matches(cards[source.pair]![source.side].effect, manifest.families[row!.family]!)).toBe(true);
    }
    counts.set(row!.family, (counts.get(row!.family) ?? 0) + 1);
  }
  for (const [id, family] of Object.entries(manifest.families)) expect(counts.get(id), id).toBe(family.count);
  expect(counts.get("bespoke")).toBe(30);
});
