import { expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

type Clause =
  | { kind: "attack"; amount: number; type: string; hits: number; ignoreWard: boolean }
  | { kind: "leech" | "banish" }
  | { kind: "heal" | "ward" | "mana" | "bless" | "curse" | "burn" | "poison"; amount: number };
function reviewedClauses(text: string): Clause[] | null {
  const sentences = text.match(/[^.]+\./g)?.map((item) => item.trim()) ?? [];
  if (sentences.join(" ") !== text) return null;
  const result: Clause[] = [];
  for (const sentence of sentences) {
    let match: RegExpExecArray | null;
    if (
      (match =
        /^Deal (\d+) (Radiance|Shadow|Growth|Decay|Binding|Release|Fire|Frost|Memory|Oblivion) damage(?: (twice|three times)|, (ignoring Ward))?\.$/.exec(
          sentence,
        ))
    )
      result.push({
        kind: "attack",
        amount: Number(match[1]),
        type: match[2]!,
        hits: match[3] === "twice" ? 2 : match[3] === "three times" ? 3 : 1,
        ignoreWard: !!match[4],
      });
    else if (sentence === "Leech.") result.push({ kind: "leech" });
    else if (sentence === "Banish this card.") result.push({ kind: "banish" });
    else if ((match = /^Heal (\d+) HP\.$/.exec(sentence)))
      result.push({ kind: "heal", amount: Number(match[1]) });
    else if ((match = /^Gain (\d+) (Ward|mana)\.$/.exec(sentence)))
      result.push({ kind: match[2]!.toLowerCase() as "ward" | "mana", amount: Number(match[1]) });
    else if ((match = /^(Bless|Curse) (\d+)\.$/.exec(sentence)))
      result.push({ kind: match[1]!.toLowerCase() as "bless" | "curse", amount: Number(match[2]) });
    else if ((match = /^Apply (\d+) (Burn|Poison)\.$/.exec(sentence)))
      result.push({ kind: match[2]!.toLowerCase() as "burn" | "poison", amount: Number(match[1]) });
    else return null;
  }
  return result.length ? result : null;
}

it("matches printed numeric card outcomes under Ward, weakness, statuses, and mana caps", () => {
  let checked = 0;
  for (const [pair, faces] of Object.entries(cards))
    for (const side of ["light", "dark"] as const) {
      const clauses = reviewedClauses(faces[side].effect);
      if (!clauses) continue;
      checked++;
      const setup = structuredClone(createRun(1).getSnapshot());
      setup.state.zones.hand = [{ id: "source", pair, face: side, kept: false }];
      setup.state.zones.library = [];
      setup.state.zones.discard = [];
      setup.state.zones.banished = [];
      Object.assign(setup.state.player, { hp: 20, ward: 2, bless: 2, curse: 1 });
      Object.assign(setup.state.enemy, { hp: 1000, maxHp: 1000, ward: 4, curse: 1, burn: 2, poison: 2 });
      const expected = {
        playerHp: 20,
        playerWard: 2,
        playerBless: 2,
        playerCurse: 1,
        enemyHp: 1000,
        enemyWard: 4,
        enemyCurse: 1,
        enemyBurn: 2,
        enemyPoison: 2,
        mana: 2,
        banished: false,
      };
      let attackTotal = 0;
      for (const clause of clauses) {
        switch (clause.kind) {
          case "attack":
            attackTotal = 0;
            for (let hit = 0; hit < clause.hits; hit++) {
              const amount = Math.max(
                0,
                clause.amount +
                  (hit === 0 && clause.type === "Shadow" ? 2 : 0) +
                  expected.playerBless -
                  expected.playerCurse,
              );
              const absorbed = clause.ignoreWard ? 0 : Math.min(expected.enemyWard, amount);
              expected.enemyWard -= absorbed;
              expected.enemyHp -= amount - absorbed;
              attackTotal += amount;
            }
            expected.playerBless = 0;
            expected.playerCurse = 0;
            break;
          case "leech":
            expected.playerHp = Math.min(30, expected.playerHp + attackTotal);
            break;
          case "heal":
            expected.playerHp = Math.min(30, expected.playerHp + clause.amount);
            break;
          case "ward":
            expected.playerWard += clause.amount;
            break;
          case "mana":
            expected.mana = Math.min(3, expected.mana + clause.amount);
            break;
          case "bless":
            expected.playerBless += clause.amount;
            break;
          case "curse":
            expected.enemyCurse += clause.amount;
            break;
          case "burn":
            expected.enemyBurn = Math.max(expected.enemyBurn, clause.amount);
            break;
          case "poison":
            expected.enemyPoison = Math.max(expected.enemyPoison, clause.amount);
            break;
          case "banish":
            expected.banished = true;
            break;
        }
      }
      const game = restoreSession(setup, runHandler);
      expect(game.dispatch({ type: "play", id: "source" }).decision, faces[side].name).toMatchObject({
        accepted: true,
      });
      const state = game.getSnapshot().state;
      const actual = {
        playerHp: state.player.hp,
        playerWard: state.player.ward,
        playerBless: state.player.bless,
        playerCurse: state.player.curse,
        enemyHp: state.enemy.hp,
        enemyWard: state.enemy.ward,
        enemyCurse: state.enemy.curse,
        enemyBurn: state.enemy.burn,
        enemyPoison: state.enemy.poison,
        mana: state.mana,
        banished: state.zones.banished.some((card) => card.id === "source"),
      };
      expect(actual, `${pair}: ${faces[side].name} — ${faces[side].effect}`).toEqual(expected);
    }
  expect(checked).toBeGreaterThan(150);
});
