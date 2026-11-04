export const relicIds = [
  "none",
  "many-eyes",
  "spare-thread",
  "cracked-vessel",
  "ashen-seal",
  "hollow-chalice",
] as const;
export type RelicId = (typeof relicIds)[number];

export const relics: Record<RelicId, { name: string; effect: string }> = {
  none: { name: "None", effect: "" },
  "many-eyes": { name: "Many Eyes", effect: "Up to four reward offers." },
  "spare-thread": { name: "Spare Thread", effect: "A second midpoint removal." },
  "cracked-vessel": { name: "Cracked Vessel", effect: "Start at 24 HP with an extra pair." },
  "ashen-seal": {
    name: "Ashen Seal",
    effect: "When a played card Banishes itself, gain 2 Ward after it resolves.",
  },
  "hollow-chalice": { name: "Hollow Chalice", effect: "Heal 3 HP when skipping a nonempty card reward." },
};
