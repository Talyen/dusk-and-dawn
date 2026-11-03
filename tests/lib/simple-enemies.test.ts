import { readFileSync, existsSync } from "node:fs";
import { expect, it } from "vitest";
import { simpleEnemies } from "../../src/lib/game/simple-enemies.generated";
import { createRun, enemyAttackHits, getEnemy, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";

it("retains reviewed independent actions and verified artwork for each supported enemy", () => {
  const source = JSON.parse(readFileSync("docs/Dusk & Dawn — Enemy Mechanics Catalogue v0.1.json", "utf8"))
    .enemies as {
    id: string;
    name: string;
    health: number;
    pattern: string[];
    actions: { id: string; name: string; preview: string }[];
  }[];
  expect(simpleEnemies).toHaveLength(110);
  for (const enemy of simpleEnemies) {
    const original = source.find((item) => item.id === enemy.id)!;
    expect(enemy.name).toBe(original.name);
    expect(enemy.hp).toBe(original.health);
    expect(enemy.actions.map((action) => action.name)).toEqual(
      original.pattern.map((id) => original.actions.find((action) => action.id === id)!.name),
    );
    expect(enemy.actions.map((action) => action.text)).toEqual(
      original.pattern.map((id) => original.actions.find((action) => action.id === id)!.preview),
    );
    const slug = enemy.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    expect(existsSync(`public/assets/enemy-${slug}.webp`)).toBe(true);
  }
});

it("resolves each supported enemy action and suppresses its trait under Hush", () => {
  for (const enemy of simpleEnemies)
    for (let actionIndex = 0; actionIndex < enemy.actions.length; actionIndex++) {
      const setup = structuredClone(createRun(8).getSnapshot());
      setup.state.encounters = ["fixture:0", enemy.id, "fixture:0", "fixture:0", "fixture:4"];
      setup.state.fight = 1;
      setup.state.action = actionIndex;
      setup.state.enemy.hp = enemy.hp;
      setup.state.enemy.maxHp = enemy.hp;
      setup.state.zones.hand = [];
      const action = getEnemy(setup.state).actions[actionIndex]!;
      const game = restoreSession(setup, runHandler);
      expect(game.dispatch({ type: "end" }).decision.accepted, `${enemy.name}: ${action.name}`).toBe(true);
      if (action.hit !== undefined)
        expect(game.getSnapshot().state.player.hp, `${enemy.name}: ${action.name}`).toBe(
          30 - enemyAttackHits(action, false).reduce((a, b) => a + b, 0),
        );
      const hushed = structuredClone(setup);
      hushed.state.enemy.hush = true;
      const muted = restoreSession(hushed, runHandler);
      muted.dispatch({ type: "end" });
      if (action.hit !== undefined) expect(muted.getSnapshot().state.player.hp).toBe(30 - action.hit);
      else expect(muted.getSnapshot().state.player.hp).toBe(30);
      expect(muted.getSnapshot().state.enemy.hush).toBe(false);
    }
});

it("builds repeatable varied five-encounter routes without repeating an enemy", () => {
  const encounters = new Set<string>();
  for (let seed = 0; seed < 50; seed++) {
    const first = createRun(seed).getSnapshot();
    expect(first).toEqual(createRun(seed).getSnapshot());
    expect(first.state.encounters).toHaveLength(5);
    expect(new Set(first.state.encounters).size).toBe(5);
    first.state.encounters!.forEach((id) => encounters.add(id));
  }
  expect(encounters.size).toBeGreaterThan(20);
});
