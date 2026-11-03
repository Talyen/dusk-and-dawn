import { expect, it } from "vitest";
import { createRun, face, type Command } from "../../src/lib/game/run";

it("runs bounded seeded playtests through the real command path", () => {
  const outcomes = { victory: 0, defeat: 0, unfinished: 0 };
  for (let seed = 0; seed < 100; seed++) {
    const game = createRun(seed);
    for (let steps = 0; steps < 300; steps++) {
      const s = game.getSnapshot().state;
      if (s.phase === "victory" || s.phase === "defeat") break;
      let command: Command;
      if (s.phase === "reward")
        command = {
          type: "reward",
          pair:
            s.offers.find(
              (p) => p === "Ivy & Thorns" || p === "Feather & Chain" || p === "Candle & Extinguished Candle",
            ) ?? null,
        };
      else if (s.phase === "rest") command = { type: "rest" };
      else {
        const priorities: Record<string, number> = {
          Sun: 20,
          Vampire: 19,
          Wither: 18,
          Thorns: 17,
          "Shattered Mirror": 17,
          Flame: s.enemy.burn < 3 ? 16 : 1,
          Candle: 15,
          Angel: s.player.ward < 5 ? 12 : 2,
          Frost: s.enemy.curse < 2 ? 11 : 1,
          Ivy: s.enemy.curse < 2 ? 11 : 1,
          Chain: s.enemy.curse < 2 ? 11 : 1,
          Key: 10,
          Moon: 9,
          Feather: 8,
          Lantern: 7,
          Bloom: s.player.hp <= 24 ? 6 : 0,
          Mirror: 6,
          Lock: 0,
          Shroud: 0,
          "Extinguished Candle": 0,
          Seed: 0,
          Memory: 0,
          Ash: 0,
          Oblivion: 0,
        };
        const playable = s.zones.hand
          .slice()
          .sort((a, b) => (priorities[face(b).name] ?? 0) - (priorities[face(a).name] ?? 0))[0];
        if (s.mana && playable && (priorities[face(playable).name] ?? 0) > 0)
          command = { type: "play", id: playable.id };
        else command = { type: "end" };
      }
      const result = game.dispatch(command);
      expect(result.decision.accepted).toBe(true);
      const next = result.snapshot.state;
      expect(next.player.hp).toBeGreaterThanOrEqual(0);
      expect(next.zones.hand.length).toBeLessThanOrEqual(8);
    }
    const phase = game.getSnapshot().state.phase;
    outcomes[phase === "victory" || phase === "defeat" ? phase : "unfinished"]++;
  }
  console.log("100 seeded heuristic playtests", outcomes);
  expect(outcomes.victory + outcomes.defeat + outcomes.unfinished).toBe(100);
  expect(outcomes.victory).toBeGreaterThan(0);
});
