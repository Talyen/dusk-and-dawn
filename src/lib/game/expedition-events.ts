export const expeditionEventIds = ["blood", "thorns", "lantern"] as const;
export type ExpeditionEventId = (typeof expeditionEventIds)[number];

/** An absent event is a route saved before event variety was introduced. */
export function expeditionEvent(id: ExpeditionEventId = "blood") {
  return {
    blood: {
      name: "Blood Bargain",
      caption: "Blood Bargain · −4 HP",
      cost: "Lose 4 HP.",
      label: "lose 4 HP",
    },
    thorns: {
      name: "Thornbound Gift",
      caption: "Thornbound Gift · Poison 4",
      cost: "Start the next fight with 4 Poison.",
      label: "start next fight with 4 Poison",
    },
    lantern: {
      name: "Fading Lantern",
      caption: "Fading Lantern · −1 mana",
      cost: "Start the next fight with 2 mana.",
      label: "start next fight with 2 mana",
    },
  }[id];
}
