import { expect, it } from "vitest";
import { cards, createRun, runHandler } from "../../src/lib/game/run";
import { restoreSession } from "../../src/lib/game/session";
import { stateRng } from "../../src/lib/game/random-state";
import type { FightCard } from "../../src/lib/game/card-zones";

type Face = { pair: string; side: "light" | "dark"; name: string; effect: string };
const catalogue: Face[] = Object.entries(cards).flatMap(([pair, faces]) =>
  (["light", "dark"] as const).map((side) => ({ pair, side, ...faces[side] })),
);
const c = (id: string, face: "light" | "dark" = "light", kept = false): FightCard => ({
  id,
  pair: "Sun & Moon",
  face,
  kept,
});
function fixture(face: Face, held: FightCard[], library: FightCard[], discard: FightCard[]) {
  const snapshot = structuredClone(createRun(4).getSnapshot());
  snapshot.state.zones.hand = [{ id: "source", pair: face.pair, face: face.side, kept: false }, ...held];
  snapshot.state.zones.library = library;
  snapshot.state.zones.discard = discard;
  snapshot.state.zones.banished = [];
  snapshot.state.zones.scry = false;
  return restoreSession(snapshot, runHandler);
}

it("self-tucking faces move the source before drawing, including an otherwise empty library", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Put this card on the bottom of your library\. Draw (\d+) cards?\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const count = Number(match[1]);
    const library = [c("bottom"), c("top", "dark")];
    const game = fixture(face, [], library, []);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.hand).toEqual(library.slice(-count).reverse());
    expect(state.zones.library.map((card) => card.id)).toEqual([
      "source",
      ...library.slice(0, library.length - count).map((card) => card.id),
    ]);
    expect(state.zones.discard).toEqual([]);
    const empty = fixture(face, [], [], []);
    empty.dispatch({ type: "play", id: "source" });
    expect(empty.getSnapshot().state.zones.hand).toEqual([
      { id: "source", pair: face.pair, face: face.side, kept: false },
    ]);
    expect(empty.getSnapshot().state.zones.library).toEqual([]);
    expect(empty.getSnapshot().state.zones.discard).toEqual([]);
  }
  expect(checked).toBe(4);
});

it("fixed discard-to-library operations preserve the printed pile end and block order", () => {
  let checked = 0;
  for (const face of catalogue) {
    const single = /^Put the (top|bottom) card of your discard pile on top of your library\.( Scry\.)?$/.exec(
      face.effect,
    );
    const topTwo =
      /^Put the top 2 cards of your discard pile on top of your library in their current order\.$/.test(
        face.effect,
      );
    const bottomTwo = /^Put the bottom 2 cards of your discard pile on the bottom of your library\.$/.test(
      face.effect,
    );
    if (!single && !topTwo && !bottomTwo) continue;
    checked++;
    const discard = [c("discard-bottom", "dark"), c("discard-middle"), c("discard-top", "dark")];
    const library = [c("old-bottom"), c("old-top")];
    const game = fixture(face, [], library, discard);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const moved = topTwo
      ? discard.slice(-2)
      : bottomTwo
        ? discard.slice(0, 2)
        : single![1] === "top"
          ? discard.slice(-1)
          : discard.slice(0, 1);
    const state = game.getSnapshot().state;
    expect(state.zones.library, face.name).toEqual(
      bottomTwo ? [...moved, ...library] : [...library, ...moved],
    );
    expect(state.zones.discard.map((card) => card.id)).toEqual([
      ...discard.filter((card) => !moved.some((item) => item.id === card.id)).map((card) => card.id),
      "source",
    ]);
    expect(state.zones.scry).toBe(!!single?.[2]);
  }
  expect(checked).toBe(12);
});

it("top-two discard returns move only what fits, with the top card first", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Return the top 2 cards of your discard pile to your hand\.( Banish this card\.)?$/.exec(
      face.effect,
    );
    if (!match) continue;
    checked++;
    for (const heldCount of [0, 7]) {
      const held = Array.from({ length: heldCount }, (_, index) => c(`held-${index}`));
      const discard = [c("bottom"), c("middle", "dark"), c("top")];
      const game = fixture(face, held, [], discard);
      expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
      const count = Math.min(2, 8 - heldCount);
      const state = game.getSnapshot().state;
      expect(state.zones.hand).toEqual([...held, ...discard.slice(-count).reverse()]);
      expect(state.zones.discard.map((card) => card.id)).toEqual([
        ...discard.slice(0, -count).map((card) => card.id),
        ...(match[1] ? [] : ["source"]),
      ]);
      expect(state.zones.banished.map((card) => card.id)).toEqual(match[1] ? ["source"] : []);
    }
  }
  expect(checked).toBe(2);
});

it("discard-face restoration returns the same physical top card on the specified face", () => {
  let checked = 0;
  for (const face of catalogue) {
    const flip = face.effect === "Flip the top card of your discard pile. Return it to your hand.";
    const light =
      face.effect === "Turn the top card of your discard pile to its light face. Return it to your hand.";
    if (!flip && !light) continue;
    checked++;
    for (const start of ["light", "dark"] as const) {
      const discard = [c("bottom"), c("top", start)];
      const game = fixture(face, [], [], discard);
      expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
      const expected = light ? "light" : start === "light" ? "dark" : "light";
      expect(game.getSnapshot().state.zones.hand).toEqual([c("top", expected)]);
      expect(game.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["bottom", "source"]);
    }
  }
  expect(checked).toBe(5);
});

it("reverse-and-Scry faces reverse only the available top block without a midway reshuffle", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Reverse the top (\d+) cards of your library\. Scry\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    for (const length of [1, 4]) {
      const library = Array.from({ length }, (_, index) => c(`lib-${index}`, index % 2 ? "dark" : "light"));
      const game = fixture(face, [], library, [c("discard")]);
      expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
      const split = Math.max(0, library.length - Number(match[1]));
      const expected = [...library.slice(0, split), ...library.slice(split).reverse()];
      const state = game.getSnapshot().state;
      expect(state.zones.library).toEqual(expected);
      expect(state.zones.discard.map((card) => card.id)).toEqual(["discard", "source"]);
      expect(state.zones.scry).toBe(true);
    }
  }
  expect(checked).toBe(3);
});

it("draw-before-Flip, facing, and Keep effects include the newly drawn card", () => {
  let checked = 0;
  for (const face of catalogue) {
    const flip = /^Draw 1 card\. Flip your hand\.( Banish this card\.)?$/.exec(face.effect);
    const turn = /^Draw 1 card\. Turn your hand to its (light|dark) faces\. Banish this card\.$/.exec(
      face.effect,
    );
    const keep = face.effect === "Draw 1 card. Keep your hand.";
    if (!flip && !turn && !keep) continue;
    checked++;
    const held = [c("kept", "dark", true), c("other", "light")];
    const library = [c("bottom"), c("drawn", "dark")];
    const game = fixture(face, held, library, []);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const expected = [...held, library[1]!].map((card) => ({
      ...card,
      face: flip ? (card.face === "light" ? "dark" : "light") : turn ? turn[1] : card.face,
      kept: keep ? true : card.kept,
    }));
    const state = game.getSnapshot().state;
    expect(state.zones.hand, face.name).toEqual(expected);
    expect(state.zones.library).toEqual([library[0]]);
    const banished = !!flip?.[1] || !!turn;
    expect(state.zones.discard.map((card) => card.id)).toEqual(banished ? [] : ["source"]);
    expect(state.zones.banished.map((card) => card.id)).toEqual(banished ? ["source"] : []);
  }
  expect(checked).toBe(6);
});

it("draw-before-random-discard may discard a newly drawn card", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Draw (\d+) cards?\. Discard a random card\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const held = [c("held-a", "dark", true), c("held-b")];
    const library = Array.from({ length: 5 }, (_, index) =>
      c(`library-${index}`, index % 2 ? "dark" : "light"),
    );
    const count = Number(match[1]);
    const afterDraw = [...held, ...library.slice(-count).reverse()];
    const seed = Array.from({ length: 100 }, (_, value) => value).find((value) => {
      const random = stateRng({ value });
      return Math.floor(random() * afterDraw.length) >= held.length;
    })!;
    const setup = structuredClone(fixture(face, held, library, []).getSnapshot());
    setup.random.value = seed;
    const random = stateRng({ value: seed });
    const selected = afterDraw[Math.floor(random() * afterDraw.length)]!;
    expect(selected.id).toMatch(/^library-/);
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.hand).toEqual(afterDraw.filter((card) => card.id !== selected.id));
    expect(state.zones.discard).toEqual([
      { ...selected, kept: false },
      { id: "source", pair: face.pair, face: face.side, kept: false },
    ]);
    expect(state.zones.library).toEqual(library.slice(0, library.length - count));
  }
  expect(checked).toBe(3);
});

it("required random hand-discard payments reject before spending and resolve the printed payoff", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match =
      /^Discard a random card\. (?:Draw (\d+) cards?|Heal (\d+) HP|Deal (\d+) (Radiance|Shadow|Growth|Decay|Binding|Release|Fire|Frost|Memory|Oblivion) damage)\.( Banish this card\.)?$/.exec(
        face.effect,
      );
    if (!match) continue;
    checked++;
    const blocked = fixture(face, [], [c("top")], []);
    const before = blocked.getSnapshot();
    expect(blocked.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(false);
    expect(blocked.getSnapshot()).toEqual(before);
    const payment = c("payment", "dark", true);
    const library = Array.from({ length: 4 }, (_, index) => c(`library-${index}`));
    const setup = structuredClone(fixture(face, [payment], library, []).getSnapshot());
    setup.state.player.hp = 20;
    setup.state.enemy.hp = 100;
    setup.state.enemy.maxHp = 100;
    setup.state.enemy.ward = 3;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.discard[0], face.name).toEqual({ ...payment, kept: false });
    expect(
      state.zones.hand.some((card) => card.id === "payment"),
      face.name,
    ).toBe(false);
    expect(state.mana, face.name).toBe(2);
    const count = Number(match[1] ?? 0);
    expect(
      state.zones.hand.map((card) => card.id),
      face.name,
    ).toEqual(
      count
        ? library
            .slice(-count)
            .reverse()
            .map((card) => card.id)
        : [],
    );
    expect(state.zones.library, face.name).toEqual(library.slice(0, library.length - count));
    expect(state.player.hp, face.name).toBe(Math.min(30, 20 + Number(match[2] ?? 0)));
    const amount = match[3] ? Number(match[3]) + (match[4] === "Shadow" ? 2 : 0) : 0;
    const absorbed = Math.min(3, amount);
    expect(state.enemy.hp, face.name).toBe(100 - amount + absorbed);
    expect(state.enemy.ward, face.name).toBe(3 - absorbed);
    expect(
      state.zones.discard.map((card) => card.id),
      face.name,
    ).toEqual(match[5] ? ["payment"] : ["payment", "source"]);
    expect(
      state.zones.banished.map((card) => card.id),
      face.name,
    ).toEqual(match[5] ? ["source"] : []);
  }
  expect(checked).toBe(6);
});

it("HP payments cannot be lethal and occur before the stated payoff", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Lose (\d+) HP\. (.*)$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const cost = Number(match[1]);
    const source = fixture(face, [], [c("bottom"), c("top")], []);
    const blockedSetup = structuredClone(source.getSnapshot());
    blockedSetup.state.player.hp = cost;
    const blocked = restoreSession(blockedSetup, runHandler);
    expect(blocked.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(false);
    expect(blocked.getSnapshot()).toEqual(blockedSetup);
    const allowedSetup = structuredClone(blockedSetup);
    allowedSetup.state.player.hp = cost + 1;
    allowedSetup.state.enemy.hp = 100;
    allowedSetup.state.enemy.maxHp = 100;
    const game = restoreSession(allowedSetup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player.hp).toBe(1);
    const damage = /^Deal (\d+) (\w+) damage\./.exec(match[2]!);
    const draw = /^Draw (\d+) cards?\./.exec(match[2]!);
    if (damage) expect(state.enemy.hp).toBe(100 - Number(damage[1]) - (damage[2] === "Shadow" ? 2 : 0));
    if (draw) expect(state.zones.hand).toHaveLength(Number(draw[1]));
    expect(state.mana).toBe(match[2]!.startsWith("Gain 1 mana.") ? 3 : 2);
    expect(state.zones.banished.some((card) => card.id === "source")).toBe(
      face.effect.endsWith("Banish this card."),
    );
  }
  expect(checked).toBe(5);
});

it("discard-pile payments must exist before a printed damage or healing payoff", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match =
      /^Banish the (top|bottom) card of your discard pile\. (Heal (\d+) HP\.|Deal (\d+) (\w+) damage(, ignoring Ward)?\.)( Banish this card\.)?$/.exec(
        face.effect,
      );
    if (!match) continue;
    checked++;
    const blocked = fixture(face, [], [], []);
    const before = blocked.getSnapshot();
    expect(blocked.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(false);
    expect(blocked.getSnapshot()).toEqual(before);
    const discard = [c("bottom", "dark"), c("top")];
    const setup = structuredClone(fixture(face, [], [], discard).getSnapshot());
    setup.state.player.hp = 20;
    setup.state.enemy.hp = 100;
    setup.state.enemy.maxHp = 100;
    setup.state.enemy.ward = 4;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    const chosen = match[1] === "top" ? discard[1]! : discard[0]!;
    expect(state.zones.banished[0]).toEqual(chosen);
    expect(state.player.hp).toBe(20 + Number(match[3] ?? 0));
    if (match[4]) {
      const amount = Number(match[4]) + (match[5] === "Shadow" ? 2 : 0);
      const absorbed = match[6] ? 0 : Math.min(4, amount);
      expect(state.enemy.hp).toBe(100 - amount + absorbed);
      expect(state.enemy.ward).toBe(4 - absorbed);
    }
    expect(state.zones.banished.some((card) => card.id === "source")).toBe(!!match[7]);
  }
  expect(checked).toBe(6);
});

it("pure Hush faces require a suppressible intent and spend their source only on a valid play", () => {
  const faces = catalogue.filter((face) => face.effect === "Hush. Banish this card.");
  expect(faces).toHaveLength(6);
  for (const face of faces) {
    const game = fixture(face, [], [], []);
    const before = game.getSnapshot();
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(false);
    expect(game.getSnapshot()).toEqual(before);
    const setup = structuredClone(before);
    setup.state.action = 1;
    const valid = restoreSession(setup, runHandler);
    expect(valid.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    expect(valid.getSnapshot().state.enemy.hush).toBe(true);
    expect(valid.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["source"]);
    valid.dispatch({ type: "end" });
    expect(valid.getSnapshot().state.player.hp).toBe(26);
    expect(valid.getSnapshot().state.enemy.hush).toBe(false);
  }
});

it("Reflect faces redirect the next hit once and banish the source", () => {
  const faces = catalogue.filter(
    (face) => face.effect === "Reflect the first hit of the enemy's next attack. Banish this card.",
  );
  expect(faces).toHaveLength(8);
  for (const face of faces) {
    const game = fixture(face, [], [], []);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    expect(game.getSnapshot().state.player.reflect).toBe(true);
    expect(game.getSnapshot().state.zones.banished.map((card) => card.id)).toEqual(["source"]);
    game.dispatch({ type: "end" });
    expect(game.getSnapshot().state.player).toMatchObject({ hp: 30, reflect: false });
    expect(game.getSnapshot().state.enemy.hp).toBe(14);
  }
});

it("Water Clock's draw can fill the vacated slot before self-Keep", () => {
  const face = catalogue.find((entry) => entry.name === "Water Clock")!;
  const held = Array.from({ length: 7 }, (_, index) => c(`held-${index}`));
  const full = fixture(face, held, [c("drawn", "dark")], []);
  expect(full.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(full.getSnapshot().state.zones.hand).toEqual([...held, c("drawn", "dark")]);
  expect(full.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  const empty = fixture(face, held, [], []);
  expect(empty.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
  expect(empty.getSnapshot().state.zones.hand.at(-1)).toEqual({
    id: "source",
    pair: face.pair,
    face: face.side,
    kept: true,
  });
});

it("random exchanges use the printed discard end and leave an empty side unchanged", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match =
      /^Exchange a random card in your hand with the (top|bottom) card of your discard pile\.$/.exec(
        face.effect,
      );
    if (!match) continue;
    checked++;
    const held = [c("held", "dark", true)];
    const discard = [c("bottom", "dark"), c("top")];
    const game = fixture(face, held, [], discard);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const incoming = match[1] === "top" ? discard[1]! : discard[0]!;
    const expectedDiscard =
      match[1] === "top"
        ? [discard[0]!, c("held", "dark"), { id: "source", pair: face.pair, face: face.side, kept: false }]
        : [c("held", "dark"), discard[1]!, { id: "source", pair: face.pair, face: face.side, kept: false }];
    expect(game.getSnapshot().state.zones.hand).toEqual([incoming]);
    expect(game.getSnapshot().state.zones.discard).toEqual(expectedDiscard);
    const empty = fixture(face, held, [], []);
    expect(empty.dispatch({ type: "play", id: "source" }).decision.accepted).toBe(true);
    expect(empty.getSnapshot().state.zones.hand).toEqual(held);
    expect(empty.getSnapshot().state.zones.discard.map((card) => card.id)).toEqual(["source"]);
  }
  expect(checked).toBe(2);
});

it("single-status removal faces preserve other statuses and resolve healing or draw afterward", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match =
      /^Remove all your (Burn|Poison|Curse)\.(?: (Draw (\d+) cards?|Heal (\d+) HP)\.)?( Banish this card\.)?$/.exec(
        face.effect,
      );
    if (!match) continue;
    checked++;
    const library = [c("bottom"), c("top", "dark")];
    const setup = structuredClone(fixture(face, [], library, []).getSnapshot());
    Object.assign(setup.state.player, { hp: 20, burn: 3, poison: 4, curse: 2, ward: 5, bless: 1 });
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player).toMatchObject({
      hp: 20 + Number(match[4] ?? 0),
      burn: match[1] === "Burn" ? 0 : 3,
      poison: match[1] === "Poison" ? 0 : 4,
      curse: match[1] === "Curse" ? 0 : 2,
      ward: 5,
      bless: 1,
    });
    const count = Number(match[3] ?? 0);
    expect(state.zones.hand).toEqual(count ? library.slice(-count).reverse() : []);
    expect(state.zones.discard.map((card) => card.id)).toEqual(match[5] ? [] : ["source"]);
    expect(state.zones.banished.map((card) => card.id)).toEqual(match[5] ? ["source"] : []);
  }
  expect(checked).toBe(8);
});

it("shuffle-hand faces clear Keep, draw the stated number, and exclude the resolving source", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Shuffle your hand into your library\. Draw (\d+) cards?\.( Banish this card\.)?$/.exec(
      face.effect,
    );
    if (!match) continue;
    checked++;
    const held = [c("held-light", "light", true), c("held-dark", "dark", true)];
    const library = [c("lib-light"), c("lib-dark", "dark")];
    const discard = [c("discard", "dark")];
    const game = fixture(face, held, library, discard);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    const count = Number(match[1]);
    expect(state.zones.hand).toHaveLength(count);
    expect([...state.zones.hand, ...state.zones.library].every((card) => !card.kept)).toBe(true);
    expect([...state.zones.hand, ...state.zones.library].map((card) => card.id).sort()).toEqual(
      [...held, ...library, ...(count > 4 ? discard : [])].map((card) => card.id).sort(),
    );
    const original = [...held, ...library, ...discard];
    for (const item of [...state.zones.hand, ...state.zones.library])
      expect(item.face).toBe(original.find((card) => card.id === item.id)!.face);
    expect(state.zones.discard.map((card) => card.id)).toEqual([
      ...(count > 4 ? [] : ["discard"]),
      ...(match[2] ? [] : ["source"]),
    ]);
    expect(state.zones.banished.map((card) => card.id)).toEqual(match[2] ? ["source"] : []);
  }
  expect(checked).toBe(6);
});

it("Cleanse and Purge remove the specified count of whole status kinds, not stacks", () => {
  const patterns = new Map<string, { kind: "cleanse" | "purge"; all: boolean; banish: boolean }>([
    [
      "Cleanse one random harmful status from yourself. Heal 3 HP. Banish this card.",
      { kind: "cleanse", all: false, banish: true },
    ],
    [
      "Cleanse all harmful statuses from yourself. Heal 3 HP. Banish this card.",
      { kind: "cleanse", all: true, banish: true },
    ],
    ["Purge one random beneficial status from the enemy.", { kind: "purge", all: false, banish: false }],
    [
      "Purge all beneficial statuses from the enemy. Banish this card.",
      { kind: "purge", all: true, banish: true },
    ],
  ]);
  const faces = catalogue.filter((face) => patterns.has(face.effect));
  expect(faces).toHaveLength(5);
  for (const face of faces) {
    const spec = patterns.get(face.effect)!;
    const setup = structuredClone(fixture(face, [], [], []).getSnapshot());
    Object.assign(setup.state.player, {
      hp: 20,
      burn: 3,
      poison: 4,
      curse: 2,
      ward: 5,
      bless: 2,
      reflect: true,
    });
    Object.assign(setup.state.enemy, { burn: 3, curse: 2, freeze: true, ward: 5, bless: 2, reflect: true });
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    if (spec.kind === "cleanse") {
      expect(
        [state.player.burn, state.player.poison, state.player.curse].filter((value) => value === 0),
      ).toHaveLength(spec.all ? 3 : 1);
      expect(
        [state.player.burn, state.player.poison, state.player.curse].filter((value) => value > 0),
      ).toHaveLength(spec.all ? 0 : 2);
      expect(state.player).toMatchObject({ hp: 23, ward: 5, bless: 2, reflect: true });
    } else {
      expect(
        [state.enemy.ward === 0, state.enemy.bless === 0, !state.enemy.reflect].filter(Boolean),
      ).toHaveLength(spec.all ? 3 : 1);
      expect(state.enemy).toMatchObject({ burn: 3, curse: 2, freeze: true });
    }
    expect(state.zones.banished.some((card) => card.id === "source")).toBe(spec.banish);
  }
});

it("healing-then-draw faces cap HP before drawing and banish their source", () => {
  let checked = 0;
  for (const face of catalogue) {
    const match = /^Heal (\d+) HP\. Draw (\d+) cards?\. Banish this card\.$/.exec(face.effect);
    if (!match) continue;
    checked++;
    const library = [c("bottom"), c("top", "dark")];
    const setup = structuredClone(fixture(face, [], library, []).getSnapshot());
    setup.state.player.hp = 28;
    const game = restoreSession(setup, runHandler);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.player.hp).toBe(Math.min(30, 28 + Number(match[1])));
    expect(state.zones.hand).toEqual(library.slice(-Number(match[2])).reverse());
    expect(state.zones.banished.map((card) => card.id)).toEqual(["source"]);
  }
  expect(checked).toBe(2);
});

it("reverse-and-Scry prepares an initially empty library from the discard once", () => {
  const faces = catalogue.filter((face) =>
    /^Reverse the top \d+ cards of your library\. Scry\.$/.test(face.effect),
  );
  expect(faces).toHaveLength(3);
  for (const face of faces) {
    const game = fixture(face, [], [], [c("only", "dark")]);
    expect(game.dispatch({ type: "play", id: "source" }).decision.accepted, face.name).toBe(true);
    const state = game.getSnapshot().state;
    expect(state.zones.library).toEqual([c("only", "dark")]);
    expect(state.zones.discard.map((card) => card.id)).toEqual(["source"]);
    expect(state.zones.scry).toBe(true);
  }
});
