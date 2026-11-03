import { expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import type { FightCard } from "../../src/lib/game/card-zones";
import { restoreSession } from "../../src/lib/game/session";
import { encodeRun, readRun } from "../../src/lib/game/run-save";

it("conserves physical cards and saves every catalogue face, including committed choices", async () => {
  for (const [pair, faces] of Object.entries(cards))
    for (const side of ["light", "dark"] as const) {
      const setup = structuredClone(createRun(123).getSnapshot());
      setup.state.deck[0]!.pair = pair;
      const fight: FightCard[] = setup.state.deck.map((card) => ({
        ...card,
        face: "light" as const,
        kept: false,
      }));
      fight[0]!.face = side;
      setup.state.zones.hand = fight.slice(0, 2);
      setup.state.zones.library = fight.slice(2, 7);
      setup.state.zones.discard = fight.slice(7);
      setup.state.zones.banished = [];
      setup.state.enemy.hp = 1000;
      setup.state.enemy.maxHp = 1000;
      setup.state.action = 1;
      const game = restoreSession(setup, runHandler);
      const name = faces[side].name;
      const targets = name === "Memory" ? [fight.at(-1)!.id] : name === "Sacrifice" ? [fight[1]!.id] : [];
      const result = game.dispatch({ type: "play", id: fight[0]!.id, targets });
      expect(result.decision, `${pair}: ${name}`).toMatchObject({ accepted: true });
      const verify = async () => {
        const current = game.getSnapshot();
        const state = current.state;
        const all = [
          ...state.zones.hand,
          ...state.zones.library,
          ...state.zones.discard,
          ...state.zones.banished,
          ...(state.pending ? [state.pending.source, ...state.pending.cards] : []),
        ];
        expect(all.map((card) => card.id).sort(), `${pair}: ${name}`).toEqual(
          state.deck.map((card) => card.id).sort(),
        );
        const loaded = await readRun({
          readCandidates: async () => [encodeRun(current)],
          write: async () => {},
        });
        expect(loaded, `${pair}: ${name}`).toEqual(current);
      };
      await verify();
      const pending = game.getSnapshot().state.pending;
      if (pending) {
        expect(
          game.dispatch({
            type: "choose",
            ids: pending.cards.slice(0, pending.required).map((card) => card.id),
          }).decision.accepted,
        ).toBe(true);
        await verify();
      }
    }
});
