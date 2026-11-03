/** Placeholder identities and colors: replace when Dusk & Dawn's keyword design is established. */
export interface KeywordDefinition {
  id: string;
  labelKey: string;
  primary: string;
  secondary: string;
}

export const keywordDefinitions: readonly KeywordDefinition[] = [
  { id: "sample-a", labelKey: "sampleKeywordA", primary: "#8dd9cb", secondary: "#397b83" },
  { id: "sample-b", labelKey: "sampleKeywordB", primary: "#b8a0eb", secondary: "#69538f" },
  { id: "sample-c", labelKey: "sampleKeywordC", primary: "#e8be86", secondary: "#9a694b" },
];
export const neutralShine = ["#cbd5e1", "#64748b", "#cbd5e1"] as const;

export function resolveKeywords(ids: readonly string[]): KeywordDefinition[] {
  const found = new Set<string>();
  return ids.flatMap((id) => {
    if (found.has(id)) return [];
    const definition = keywordDefinitions.find((entry) => entry.id === id);
    if (!definition) return [];
    found.add(id);
    return [definition];
  });
}

export function keywordColors(ids: readonly string[]): string[] {
  const entries = resolveKeywords(ids).slice(0, 3);
  if (!entries.length) return [...neutralShine];
  if (entries.length === 1) return [entries[0]!.primary, entries[0]!.secondary, entries[0]!.primary];
  return [...entries.map((entry) => entry.primary), entries[0]!.primary];
}

export function keywordPlasma(ids: readonly string[]) {
  const entries = resolveKeywords(ids);
  const first = entries[0];
  return first ? { primary: first.primary, secondary: entries[1]?.primary ?? first.secondary } : null;
}

export interface KeywordLabel {
  id: string;
  label: string;
}
export type KeywordTextPart = { text: string; keywordId?: string };

/** Matches complete visible labels, longest first, without styling fragments of other words. */
export function splitKeywordText(text: string, labels: readonly KeywordLabel[]): KeywordTextPart[] {
  const candidates = labels
    .filter((item) => item.label.length > 0)
    .slice()
    .sort((a, b) => b.label.length - a.label.length);
  const result: KeywordTextPart[] = [];
  const word = /[\p{L}\p{N}_]/u;
  let index = 0;
  let plain = 0;
  while (index < text.length) {
    const hit = candidates.find(({ label }) => {
      const segment = text.slice(index, index + label.length);
      if (segment.toLocaleLowerCase() !== label.toLocaleLowerCase()) return false;
      const before = index > 0 ? text[index - 1] : undefined;
      const after = text[index + label.length];
      return (
        !(before && word.test(before) && word.test(label[0]!)) &&
        !(after && word.test(after) && word.test(label[label.length - 1]!))
      );
    });
    if (!hit) {
      index++;
      continue;
    }
    if (plain < index) result.push({ text: text.slice(plain, index) });
    result.push({ text: text.slice(index, index + hit.label.length), keywordId: hit.id });
    index += hit.label.length;
    plain = index;
  }
  if (plain < text.length) result.push({ text: text.slice(plain) });
  return result;
}
