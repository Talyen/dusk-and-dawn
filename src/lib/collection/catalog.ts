import { cards } from "../game/run";
import { simpleEnemies } from "../game/simple-enemies.generated";
import { collectionIndex } from "./index.generated";
export type CollectionKind = "cards" | "enemies";
export interface CollectionEntry {
  id: string;
  kind: CollectionKind;
  number: number;
  titleKey: string;
  descriptionKey: string;
  title?: string;
  description?: string;
  art?: string;
  keywordIds: readonly string[];
}

/** Temporary catalog used only to exercise the Collection until real content exists. */
export const sampleCatalog: readonly CollectionEntry[] = (["cards", "enemies"] as const).flatMap((kind) =>
  Array.from({ length: 12 }, (_, index) => ({
    id: `sample-${kind}-${index + 1}`,
    kind,
    number: index + 1,
    titleKey: kind === "cards" ? "playerCardNumber" : "enemyCardNumber",
    descriptionKey: index % 5 === 4 ? "placeholderDescription" : "sampleDescription",
    keywordIds:
      index % 5 === 4
        ? []
        : index % 5 === 2
          ? ["sample-a", "sample-b"]
          : [index % 5 === 0 ? "sample-a" : index % 5 === 1 ? "sample-b" : "sample-c"],
  })),
);
/** Demonstration only; no placeholder discovery is written to a player's save. */
export const sampleDiscoveredIds: ReadonlySet<string> = new Set(
  sampleCatalog.filter((entry) => entry.number <= 4).map((entry) => entry.id),
);

export function collectionItems(
  kind: CollectionKind,
  discoveredIds: ReadonlySet<string>,
  catalog: readonly CollectionEntry[] = sampleCatalog,
) {
  return catalog
    .filter((entry) => entry.kind === kind)
    .map((entry) => ({ ...entry, discovered: discoveredIds.has(entry.id) }));
}

export const STARTER_PAIRS = [
  "Angel & Vampire",
  "Sun & Moon",
  "Bloom & Wither",
  "Flame & Frost",
  "Key & Lock",
] as const;

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const realCatalog: readonly CollectionEntry[] = [
  ...collectionIndex.cards.map(({ pair, side }, index) => {
    const face = cards[pair]![side];
    return {
      id: `card:${face.name}`,
      kind: "cards" as const,
      number: index + 1,
      titleKey: "",
      descriptionKey: "",
      title: face.name,
      description: face.effect,
      art: `${import.meta.env.BASE_URL}assets/card-${slug(face.name)}.webp`,
      keywordIds: face.keywords,
    };
  }),
  ...collectionIndex.enemies.map(({ id, keywords }, index) => {
    const enemy = simpleEnemies.find((item) => item.id === id)!;
    return {
      id: `enemy:${id}`,
      kind: "enemies" as const,
      number: index + 1,
      titleKey: "",
      descriptionKey: "",
      title: enemy.name,
      description: `Weakness: ${enemy.weakness}. ${enemy.trait}: ${enemy.traitEffect} Pattern: ${enemy.actions.map((action) => `${action.name}: ${action.text}`).join(" → ")}`,
      art: `${import.meta.env.BASE_URL}assets/enemy-${slug(enemy.name)}.webp`,
      keywordIds: keywords,
    };
  }),
];
const key = "dusk-and-dawn.collection.v1";
export function starterDiscoveries(): Set<string> {
  return new Set(
    STARTER_PAIRS.flatMap((pair) => [`card:${cards[pair]!.light.name}`, `card:${cards[pair]!.dark.name}`]),
  );
}
export function readDiscoveries(storage: Storage | null): Set<string> {
  const initial = starterDiscoveries();
  if (!storage) return initial;
  try {
    const raw = storage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed))
      for (const id of parsed)
        if (typeof id === "string" && realCatalog.some((entry) => entry.id === id)) initial.add(id);
  } catch {
    /* Keep the starter collection available. */
  }
  return initial;
}
export function saveDiscoveries(storage: Storage | null, ids: ReadonlySet<string>): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify([...ids]));
    return true;
  } catch {
    return false;
  }
}
