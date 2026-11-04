// Diagnostic reward sampling only: this fast-forwards combat and picks the first reward.
// Run `node scripts/sample-rewards.mjs [seeds-per-scenario]` from the repository.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = fileURLToPath(new URL("..", import.meta.url));
const seeds = Number(process.argv[2] ?? 300);
if (!Number.isSafeInteger(seeds) || seeds < 1) throw new Error("Expected a positive integer seed count");
const server = await createServer({
  root,
  configFile: false,
  cacheDir: join(tmpdir(), "dusk-reward-sample-vite"),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { createRun, runHandler, cards } = await server.ssrLoadModule("/src/lib/game/run.ts");
  const { restoreSession } = await server.ssrLoadModule("/src/lib/game/session.ts");
  function win(game, hero) {
    const snapshot = structuredClone(game.getSnapshot());
    snapshot.state.enemy.hp = 1;
    const zones = snapshot.state.zones;
    const attacker = hero === "oathless-seraph" ? "Seraph & Fallen Seraph" : "Sun & Moon";
    const card = [...zones.hand, ...zones.library, ...zones.discard].find((item) => item.pair === attacker);
    if (!card) throw new Error(`Missing attacker: ${attacker}`);
    for (const name of ["hand", "library", "discard"])
      zones[name] = zones[name].filter((item) => item.id !== card.id);
    card.face = "light";
    card.kept = false;
    zones.hand.push(card);
    snapshot.state.mana = 3;
    const resumed = restoreSession(snapshot, runHandler);
    const result = resumed.dispatch({ type: "play", id: card.id });
    if (!result.decision.accepted || result.snapshot.state.phase !== "reward")
      throw new Error("Fight did not finish");
    return resumed;
  }
  function hasDuplicate(offers, side) {
    return new Set(offers.map((pair) => cards[pair][side].effect)).size < offers.length;
  }
  const rows = [];
  const distinctPairs = new Set();
  for (const tier of [1, 3])
    for (const hero of ["oathless-seraph", "thorn-witch", "veiled-oracle"]) {
      for (const orientation of ["light", "dark"]) {
        const result = { tier, hero, orientation, screens: 0, duplicateLight: 0, duplicateDark: 0 };
        for (let seed = 0; seed < seeds; seed++) {
          let game = createRun(seed, { id: `sample-${seed}`, tier, orientation, relic: "none" }, hero);
          game = win(game, hero);
          const first = game.getSnapshot().state.offers;
          const choice = first[0];
          if (!game.dispatch({ type: "reward", pair: choice }).decision.accepted)
            throw new Error("Reward rejected");
          if (!game.dispatch({ type: "route", choice: "rest" }).decision.accepted)
            throw new Error("Route rejected");
          game = win(game, hero);
          const second = game.getSnapshot().state.offers;
          for (const offers of [first, second]) {
            result.screens++;
            result.duplicateLight += Number(hasDuplicate(offers, "light"));
            result.duplicateDark += Number(hasDuplicate(offers, "dark"));
            for (const pair of offers) distinctPairs.add(pair);
          }
        }
        rows.push(result);
      }
    }
  console.table(rows);
  console.log(
    `Distinct pairs observed: ${distinctPairs.size}. Fights were fast-forwarded; this is not a balance or win-rate test.`,
  );
} finally {
  await server.close();
}
