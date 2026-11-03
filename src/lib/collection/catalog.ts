export type CollectionKind = "cards" | "enemies";
export interface CollectionEntry {
  id: string;
  kind: CollectionKind;
  number: number;
  titleKey: string;
  descriptionKey: string;
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
