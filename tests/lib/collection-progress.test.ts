import { expect, it } from "vitest";
import {
  readDiscoveries,
  realCatalog,
  saveDiscoveries,
  starterDiscoveries,
} from "../../src/lib/collection/catalog";

it("indexes every card face and enemy with project artwork", () => {
  expect(realCatalog.filter((entry) => entry.kind === "cards")).toHaveLength(496);
  expect(realCatalog.filter((entry) => entry.kind === "enemies")).toHaveLength(110);
  expect(new Set(realCatalog.map((entry) => entry.id)).size).toBe(606);
  expect(realCatalog.every((entry) => !!entry.art && !!entry.title && !!entry.description)).toBe(true);
});

it("starts with the starter faces and retains valid discoveries", () => {
  let value: string | null = null;
  const storage = {
    getItem: () => value,
    setItem: (_key: string, data: string) => {
      value = data;
    },
  } as unknown as Storage;
  const ids = starterDiscoveries();
  expect(ids.size).toBe(10);
  expect(ids.has("card:Angel")).toBe(true);
  expect(ids.has("enemy:radiant-moth")).toBe(false);
  ids.add("enemy:radiant-moth");
  ids.add("unknown");
  expect(saveDiscoveries(storage, ids)).toBe(true);
  const loaded = readDiscoveries(storage);
  expect(loaded.has("enemy:radiant-moth")).toBe(true);
  expect(loaded.has("unknown")).toBe(false);
});
