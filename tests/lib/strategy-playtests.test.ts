import { expect, it } from "vitest";
import {
  cardRestriction,
  createRun,
  face,
  getEnemy,
  type Command,
  type RunState,
} from "../../src/lib/game/run";
import type { FightCard } from "../../src/lib/game/card-zones";

type Policy = "attack" | "defense" | "control" | "random";
function policyRandom(seed: number) {
  let value = (seed + 0x9e3779b9) >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x100000000;
  };
}
function score(card: FightCard, state: RunState, policy: Policy): number {
  const text = face(card).effect;
  const match =
    /Deal (\d+) (Radiance|Shadow|Growth|Decay|Binding|Release|Fire|Frost|Memory|Oblivion) damage/.exec(text);
  const hits = text.includes("three times") ? 3 : text.includes("twice") ? 2 : 1;
  const damage = match ? Number(match[1]) * hits + (match[2] === getEnemy(state).weakness ? 2 : 0) : 0;
  const ward = Number(/Gain (\d+) Ward/.exec(text)?.[1] ?? 0);
  const heal = Number(/Heal (\d+) HP/.exec(text)?.[1] ?? 0);
  const curse = Number(/Curse (\d+)/.exec(text)?.[1] ?? 0);
  const burn = Number(/Apply (\d+) Burn/.exec(text)?.[1] ?? 0);
  const poison = Number(/Apply (\d+) Poison/.exec(text)?.[1] ?? 0);
  const draw = Number(/Draw (\d+) cards?/.exec(text)?.[1] ?? 0);
  let value = damage * (policy === "attack" ? 4 : 2);
  value += Math.min(ward, Math.max(0, 8 - state.player.ward)) * (policy === "defense" ? 4 : 1);
  value += Math.min(heal, state.player.maxHp - state.player.hp) * (policy === "defense" ? 5 : 2);
  if (curse && state.enemy.curse < curse) value += curse * (policy === "control" ? 7 : 2);
  if (burn > state.enemy.burn) value += burn * (policy === "control" ? 7 : 3);
  if (poison > state.enemy.poison) value += poison * (policy === "control" ? 7 : 3);
  if (/\b(Hush|Freeze)\./.test(text)) value += policy === "control" ? 18 : 6;
  if (text.includes("Reflect the first hit")) value += policy === "defense" ? 10 : 4;
  value += draw * 3 + (text.includes("Flip your hand") ? 4 : 0) + (text.includes("Gain 1 mana") ? 3 : 0);
  if (text.includes("Lose 2 HP")) value -= state.player.hp < 8 ? 20 : 2;
  if (text.includes("Banish another card of your choice")) value -= 5;
  return value;
}

it("compares four bounded strategies over 100 seeded runs each", () => {
  const results: Record<string, unknown> = {};
  for (const policy of ["attack", "defense", "control", "random"] as const) {
    const counts = { victory: 0, defeat: 0, unfinished: 0 };
    const winHp: number[] = [];
    let turns = 0;
    let plays = 0;
    for (let seed = 0; seed < 100; seed++) {
      const game = createRun(seed);
      const random = policyRandom(seed + 701);
      for (let step = 0; step < 400; step++) {
        const state = game.getSnapshot().state;
        if (state.phase === "victory" || state.phase === "defeat") break;
        let command: Command;
        if (state.phase === "reward") {
          const options = state.offers.slice();
          if (policy === "random")
            command = { type: "reward", pair: options[Math.floor(random() * options.length)] ?? null };
          else {
            const ranked = options
              .map((pair) => {
                const light: FightCard = { id: "preview", pair, face: "light", kept: false };
                const dark: FightCard = { ...light, face: "dark" };
                return { pair, value: Math.max(score(light, state, policy), score(dark, state, policy)) };
              })
              .sort((a, b) => b.value - a.value);
            command = { type: "reward", pair: ranked[0]?.value ? ranked[0].pair : null };
          }
        } else if (state.phase === "rest") command = { type: "rest" };
        else if (state.pending) {
          const choices = state.pending.cards.slice();
          if (policy !== "random") choices.sort((a, b) => score(b, state, policy) - score(a, state, policy));
          command = { type: "choose", ids: choices.slice(0, state.pending.required).map((card) => card.id) };
        } else {
          const available = state.zones.hand.filter((card) => !cardRestriction(state, card));
          const ranked = available
            .map((card) => ({ card, value: policy === "random" ? random() : score(card, state, policy) }))
            .sort((a, b) => b.value - a.value);
          const choice = state.mana && ranked[0] && ranked[0].value > 0 ? ranked[0].card : undefined;
          if (!choice) {
            command = { type: "end" };
            turns++;
          } else {
            const name = face(choice).name;
            const targets =
              name === "Memory"
                ? state.zones.discard.slice(0, 1).map((card) => card.id)
                : name === "Sacrifice"
                  ? state.zones.hand
                      .filter((card) => card.id !== choice.id)
                      .slice(0, 1)
                      .map((card) => card.id)
                  : [];
            command = { type: "play", id: choice.id, targets };
            plays++;
          }
        }
        const result = game.dispatch(command);
        expect(
          result.decision,
          `${policy} seed ${seed} step ${step}: ${JSON.stringify(command)}`,
        ).toMatchObject({ accepted: true });
        expect(result.snapshot.state.zones.hand.length).toBeLessThanOrEqual(8);
      }
      const state = game.getSnapshot().state;
      const outcome = state.phase === "victory" || state.phase === "defeat" ? state.phase : "unfinished";
      counts[outcome]++;
      if (outcome === "victory") winHp.push(state.player.hp);
    }
    results[policy] = {
      ...counts,
      meanVictoryHp: winHp.length
        ? +(winHp.reduce((sum, hp) => sum + hp, 0) / winHp.length).toFixed(1)
        : null,
      turns,
      plays,
    };
    expect(counts.victory + counts.defeat + counts.unfinished).toBe(100);
  }
  console.log("Strategy playtests, 100 runs each", JSON.stringify(results));
});

it("compares experimental routes, relics and orientations over 50 seeds each", () => {
  const results: Record<string, unknown> = {};
  for (const variant of [
    { name: "rest", relic: "none", orientation: "light", path: "rest" },
    { name: "combat", relic: "none", orientation: "light", path: "combat" },
    { name: "many-eyes", relic: "many-eyes", orientation: "light", path: "combat" },
    { name: "event", relic: "spare-thread", orientation: "light", path: "event" },
    { name: "dark-vessel", relic: "cracked-vessel", orientation: "dark", path: "rest" },
  ] as const) {
    const policy: Policy = "attack";
    const counts = { victory: 0, defeat: 0, unfinished: 0 };
    const winHp: number[] = [];
    let turns = 0;
    let plays = 0;
    for (let seed = 0; seed < 50; seed++) {
      const game = createRun(seed, {
        id: `experiment-${seed}`,
        tier: 3,
        orientation: variant.orientation,
        relic: variant.relic,
      });
      for (let step = 0; step < 400; step++) {
        const state = game.getSnapshot().state;
        if (state.phase === "victory" || state.phase === "defeat") break;
        let command: Command;
        if (state.phase === "reward") {
          const options = state.offers.slice();
          const ranked = options
            .map((pair) => {
              const light: FightCard = { id: "preview", pair, face: "light", kept: false };
              const dark: FightCard = { ...light, face: "dark" };
              return { pair, value: Math.max(score(light, state, policy), score(dark, state, policy)) };
            })
            .sort((a, b) => b.value - a.value);
          command = { type: "reward", pair: ranked[0]?.value ? ranked[0].pair : null };
        } else if (state.phase === "rest") command = { type: "rest" };
        else if (state.phase === "route")
          command = {
            type: "route",
            choice: variant.path === "event" && state.player.hp <= 4 ? "rest" : variant.path,
          };
        else if (state.pending) {
          const choices = state.pending.cards.slice();
          choices.sort((a, b) => score(b, state, policy) - score(a, state, policy));
          command = { type: "choose", ids: choices.slice(0, state.pending.required).map((card) => card.id) };
        } else {
          const available = state.zones.hand.filter((card) => !cardRestriction(state, card));
          const ranked = available
            .map((card) => ({ card, value: score(card, state, policy) }))
            .sort((a, b) => b.value - a.value);
          const choice = state.mana && ranked[0] && ranked[0].value > 0 ? ranked[0].card : undefined;
          if (!choice) {
            command = { type: "end" };
            turns++;
          } else {
            const name = face(choice).name;
            const targets =
              name === "Memory"
                ? state.zones.discard.slice(0, 1).map((card) => card.id)
                : name === "Sacrifice"
                  ? state.zones.hand
                      .filter((card) => card.id !== choice.id)
                      .slice(0, 1)
                      .map((card) => card.id)
                  : [];
            command = { type: "play", id: choice.id, targets };
            plays++;
          }
        }
        const result = game.dispatch(command);
        expect(
          result.decision,
          `${policy} seed ${seed} step ${step}: ${JSON.stringify(command)}`,
        ).toMatchObject({ accepted: true });
        expect(result.snapshot.state.zones.hand.length).toBeLessThanOrEqual(8);
      }
      const state = game.getSnapshot().state;
      const outcome = state.phase === "victory" || state.phase === "defeat" ? state.phase : "unfinished";
      counts[outcome]++;
      if (outcome === "victory") winHp.push(state.player.hp);
    }
    results[variant.name] = {
      ...counts,
      meanVictoryHp: winHp.length
        ? +(winHp.reduce((sum, hp) => sum + hp, 0) / winHp.length).toFixed(1)
        : null,
      turns,
      plays,
    };
    expect(counts.victory + counts.defeat + counts.unfinished).toBe(50);
  }
  console.log("Expedition playtests, 50 runs each", JSON.stringify(results));
});

it("isolates orientation and Cracked Vessel across attack and defense policies", () => {
  const results: Record<string, unknown> = {};
  for (const policy of ["attack", "defense"] as const)
    for (const variant of [
      { name: "light", relic: "none", orientation: "light", path: "rest" },
      { name: "light-vessel", relic: "cracked-vessel", orientation: "light", path: "rest" },
      { name: "dark", relic: "none", orientation: "dark", path: "rest" },
      { name: "dark-vessel", relic: "cracked-vessel", orientation: "dark", path: "rest" },
    ] as const) {
      const counts = { victory: 0, defeat: 0, unfinished: 0 };
      const winHp: number[] = [];
      const openingHp: number[] = [];
      const played: Record<string, number> = {};
      let turns = 0;
      let plays = 0;
      for (let seed = 0; seed < 100; seed++) {
        const game = createRun(seed, {
          id: `experiment-${seed}`,
          tier: 3,
          orientation: variant.orientation,
          relic: variant.relic,
        });
        let recordedOpening = false;
        for (let step = 0; step < 400; step++) {
          const state = game.getSnapshot().state;
          if (state.phase === "victory" || state.phase === "defeat") break;
          if (!recordedOpening && state.phase === "reward" && state.fight === 0) {
            openingHp.push(state.player.hp);
            recordedOpening = true;
          }
          let command: Command;
          if (state.phase === "reward") {
            const options = state.offers.slice();
            const ranked = options
              .map((pair) => {
                const light: FightCard = { id: "preview", pair, face: "light", kept: false };
                const dark: FightCard = { ...light, face: "dark" };
                return { pair, value: Math.max(score(light, state, policy), score(dark, state, policy)) };
              })
              .sort((a, b) => b.value - a.value);
            command = { type: "reward", pair: ranked[0]?.value ? ranked[0].pair : null };
          } else if (state.phase === "rest") command = { type: "rest" };
          else if (state.phase === "route")
            command = {
              type: "route",
              choice: variant.path,
            };
          else if (state.pending) {
            const choices = state.pending.cards.slice();
            choices.sort((a, b) => score(b, state, policy) - score(a, state, policy));
            command = {
              type: "choose",
              ids: choices.slice(0, state.pending.required).map((card) => card.id),
            };
          } else {
            const available = state.zones.hand.filter((card) => !cardRestriction(state, card));
            const ranked = available
              .map((card) => ({ card, value: score(card, state, policy) }))
              .sort((a, b) => b.value - a.value);
            const choice = state.mana && ranked[0] && ranked[0].value > 0 ? ranked[0].card : undefined;
            if (!choice) {
              command = { type: "end" };
              turns++;
            } else {
              const name = face(choice).name;
              played[name] = (played[name] ?? 0) + 1;
              const targets =
                name === "Memory"
                  ? state.zones.discard.slice(0, 1).map((card) => card.id)
                  : name === "Sacrifice"
                    ? state.zones.hand
                        .filter((card) => card.id !== choice.id)
                        .slice(0, 1)
                        .map((card) => card.id)
                    : [];
              command = { type: "play", id: choice.id, targets };
              plays++;
            }
          }
          const result = game.dispatch(command);
          expect(
            result.decision,
            `${policy} seed ${seed} step ${step}: ${JSON.stringify(command)}`,
          ).toMatchObject({ accepted: true });
          expect(result.snapshot.state.zones.hand.length).toBeLessThanOrEqual(8);
        }
        const state = game.getSnapshot().state;
        const outcome = state.phase === "victory" || state.phase === "defeat" ? state.phase : "unfinished";
        counts[outcome]++;
        if (outcome === "victory") winHp.push(state.player.hp);
      }
      results[`${policy}-${variant.name}`] = {
        ...counts,
        meanVictoryHp: winHp.length
          ? +(winHp.reduce((sum, hp) => sum + hp, 0) / winHp.length).toFixed(1)
          : null,
        meanOpeningHp: openingHp.length
          ? +(openingHp.reduce((a, b) => a + b, 0) / openingHp.length).toFixed(1)
          : null,
        topPlays: Object.entries(played)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        turns,
        plays,
      };
      expect(counts.victory + counts.defeat + counts.unfinished).toBe(100);
    }
  console.log("Orientation and relic factorial, 100 runs each", JSON.stringify(results));
}, 20000);
