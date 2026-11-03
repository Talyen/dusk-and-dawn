import { z } from "zod";
import { cards, getEnemy, route, runHandler, validEncounter, type RunState } from "./run";
import { restoreSession, type Snapshot } from "./session";
import { decodeSave, encodeSave, snapshotFromSave, snapshotToSave, type SaveBackend } from "../save/save";

const integer = z.number().int().nonnegative().safe();
const cardPair = z.enum(Object.keys(cards) as [keyof typeof cards, ...(keyof typeof cards)[]]);
const deckCard = z.object({ id: z.string().min(1), pair: cardPair }).strict();
const fightCard = deckCard.extend({ face: z.enum(["light", "dark"]), kept: z.boolean() }).strict();
const combatant = z
  .object({
    hp: integer,
    maxHp: integer.positive(),
    ward: integer,
    burn: integer,
    poison: integer,
    bless: integer,
    curse: integer,
    reflect: z.boolean(),
    hush: z.boolean(),
    freeze: z.boolean(),
    nextDrawPenalty: integer,
    nextManaPenalty: integer,
  })
  .strict()
  .refine((value) => value.hp <= value.maxHp);
const runSchema = z
  .object({
    phase: z.enum(["battle", "reward", "rest", "victory", "defeat"]),
    fight: integer.max(route.length - 1),
    encounters: z.array(z.string().refine(validEncounter)).length(route.length).optional(),
    deck: z.array(deckCard),
    nextId: integer,
    player: combatant,
    enemy: combatant,
    zones: z
      .object({
        library: z.array(fightCard),
        hand: z.array(fightCard).max(8),
        discard: z.array(fightCard),
        banished: z.array(fightCard),
        scry: z.boolean(),
      })
      .strict(),
    mana: integer.max(3),
    action: integer,
    latestDirectHit: integer.optional(),
    offers: z.array(cardPair),
    message: z.string(),
    pending: z
      .object({
        kind: z.enum(["order", "select-bottom", "select-discard"]),
        source: fightCard,
        cards: z.array(fightCard).max(4),
        required: integer.max(4),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((run, ctx) => {
    if (run.action >= getEnemy(run).actions.length)
      ctx.addIssue({ code: "custom", message: "Invalid enemy action" });
    const deck = new Map(run.deck.map((card) => [card.id, card.pair]));
    if (deck.size !== run.deck.length) ctx.addIssue({ code: "custom", message: "Duplicate deck card" });
    if (run.pending && run.phase !== "battle")
      ctx.addIssue({ code: "custom", message: "Invalid pending phase" });
    if (run.phase === "battle") {
      const fight = [
        ...run.zones.library,
        ...run.zones.hand,
        ...run.zones.discard,
        ...run.zones.banished,
        ...(run.pending ? [run.pending.source, ...run.pending.cards] : []),
      ];
      if (
        run.pending &&
        (run.pending.required > run.pending.cards.length ||
          (run.pending.kind === "order" && run.pending.required !== run.pending.cards.length) ||
          (run.pending.kind !== "order" && run.pending.required > 8 - run.zones.hand.length))
      )
        ctx.addIssue({ code: "custom", message: "Invalid pending choice" });
      if (
        fight.length !== run.deck.length ||
        new Set(fight.map((card) => card.id)).size !== fight.length ||
        fight.some((card) => deck.get(card.id) !== card.pair)
      )
        ctx.addIssue({ code: "custom", message: "Invalid fight card zones" });
    }
  });
const payload = z
  .object({ kind: z.literal("dusk-dawn-preview-run"), schemaVersion: z.literal(1), run: runSchema })
  .strict();

/** Try both copies, including a valid envelope whose run data is malformed. */
export async function readRun(backend: SaveBackend): Promise<Snapshot<RunState> | null> {
  const candidates = await backend.readCandidates();
  if (!candidates.length) return null;
  for (const candidate of candidates) {
    try {
      const snapshot = snapshotFromSave(decodeSave(candidate), payload);
      return { ...snapshot, state: snapshot.state.run };
    } catch {
      /* Try the retained copy. */
    }
  }
  throw new Error("No valid saved run was found.");
}
export function encodeRun(snapshot: Snapshot<RunState>): string {
  return encodeSave(
    snapshotToSave({
      ...snapshot,
      state: { kind: "dusk-dawn-preview-run", schemaVersion: 1, run: snapshot.state },
    }),
  );
}
export function resumeRun(snapshot: Snapshot<RunState>) {
  return restoreSession(snapshot, runHandler);
}
