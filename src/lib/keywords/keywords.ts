/** Shared keyword presentation for descriptions, borders, and backgrounds. */
export interface KeywordDefinition {
  id: string;
  labelKey: string;
  primary: string;
  secondary: string;
}

export const keywordDefinitions: readonly KeywordDefinition[] = [
  { id: "Radiance", labelKey: "keywordRadiance", primary: "#F7D670", secondary: "#F7D670" },
  { id: "Shadow", labelKey: "keywordShadow", primary: "#C7AEF1", secondary: "#C7AEF1" },
  { id: "Growth", labelKey: "keywordGrowth", primary: "#9DDA97", secondary: "#9DDA97" },
  { id: "Decay", labelKey: "keywordDecay", primary: "#C7CD78", secondary: "#C7CD78" },
  { id: "Binding", labelKey: "keywordBinding", primary: "#80D1BE", secondary: "#80D1BE" },
  { id: "Release", labelKey: "keywordRelease", primary: "#7DDDEC", secondary: "#7DDDEC" },
  { id: "Fire", labelKey: "keywordFire", primary: "#FFAD66", secondary: "#FFAD66" },
  { id: "Frost", labelKey: "keywordFrost", primary: "#A8E5FA", secondary: "#A8E5FA" },
  { id: "Memory", labelKey: "keywordMemory", primary: "#B8C7FF", secondary: "#B8C7FF" },
  { id: "Oblivion", labelKey: "keywordOblivion", primary: "#C5C5CD", secondary: "#C5C5CD" },
  { id: "Ward", labelKey: "keywordWard", primary: "#8BCBFF", secondary: "#8BCBFF" },
  { id: "Burn", labelKey: "keywordBurn", primary: "#FF966B", secondary: "#FF966B" },
  { id: "Poison", labelKey: "keywordPoison", primary: "#B2D67C", secondary: "#B2D67C" },
  { id: "Flip", labelKey: "keywordFlip", primary: "#D8ABFF", secondary: "#D8ABFF" },
  { id: "Banish", labelKey: "keywordBanish", primary: "#F3A5B6", secondary: "#F3A5B6" },
  { id: "Scry", labelKey: "keywordScry", primary: "#86D8D0", secondary: "#86D8D0" },
  { id: "Bless", labelKey: "keywordBless", primary: "#F5D58C", secondary: "#F5D58C" },
  { id: "Curse", labelKey: "keywordCurse", primary: "#D4A2E4", secondary: "#D4A2E4" },
  { id: "Freeze", labelKey: "keywordFreeze", primary: "#90CDEC", secondary: "#90CDEC" },
  { id: "Cleanse", labelKey: "keywordCleanse", primary: "#A4E5CF", secondary: "#A4E5CF" },
  { id: "Purge", labelKey: "keywordPurge", primary: "#F4B3A1", secondary: "#F4B3A1" },
  { id: "Hush", labelKey: "keywordHush", primary: "#B5BCD1", secondary: "#B5BCD1" },
  { id: "Keep", labelKey: "keywordKeep", primary: "#B6E1A8", secondary: "#B6E1A8" },
  { id: "Reflect", labelKey: "keywordReflect", primary: "#9DDDFF", secondary: "#9DDDFF" },
  { id: "Leech", labelKey: "keywordLeech", primary: "#EF9EAC", secondary: "#EF9EAC" },

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
