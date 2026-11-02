import { describe, expect, it, vi } from "vitest";
import { createSeededRng } from "../../src/lib/random";
import { randomState, stateRng } from "../../src/lib/game/random-state";
import { createSession, restoreSession, type Handler } from "../../src/lib/game/session";
import { replay } from "../../src/lib/game/headless";

type Command = "draw" | "reject" | "throw" | "invalid";
const handler: Handler<{ draws: number[] }, Command, number> = (draft, command, rng) => {
  const draw = rng();
  draft.draws.push(draw);
  if (command === "reject") return { accepted: false, reason: "rejected" };
  if (command === "throw") throw new Error("failure");
  if (command === "invalid") draft.draws.push(Infinity);
  return { accepted: true, effects: [draw] };
};
describe("game session", () => {
  it("matches the existing generator and resumes from saved random state", () => {
    const old = createSeededRng(42),
      state = randomState(42),
      next = stateRng(state);
    expect([next(), next()]).toEqual([old(), old()]);
    const restored = stateRng(structuredClone(state));
    expect(restored()).toBe(next());
  });
  it("rolls back state and random draws on rejection or failure", () => {
    const game = createSession({ draws: [] }, 7, handler);
    const before = game.getSnapshot();
    expect(game.dispatch("reject").decision.accepted).toBe(false);
    expect(game.getSnapshot()).toBe(before);
    expect(() => game.dispatch("throw")).toThrow("failure");
    expect(game.getSnapshot()).toBe(before);
    expect(() => game.dispatch("invalid")).toThrow();
    expect(game.getSnapshot()).toBe(before);
    expect(game.dispatch("draw").snapshot).toEqual(replay({ draws: [] }, 7, ["draw"], handler).snapshot);
  });
  it("continues from a detached saved snapshot", () => {
    const original = createSession({ draws: [] }, 3, handler);
    original.dispatch("draw");
    const restored = restoreSession(structuredClone(original.getSnapshot()), handler);
    expect(restored.dispatch("draw").snapshot).toEqual(original.dispatch("draw").snapshot);
  });
  it("keeps a committed result stable when observers fail or dispatch again", () => {
    const game = createSession({ draws: [] }, 7, handler);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let once = false;
    game.subscribe(() => {
      throw new Error("observer");
    });
    game.subscribe(() => {
      if (!once) {
        once = true;
        game.dispatch("draw");
      }
    });
    try {
      expect(game.dispatch("draw").snapshot.revision).toBe(1);
      expect(game.getSnapshot().revision).toBe(2);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  it("replays an identical command sequence", () => {
    const commands: Command[] = ["draw", "reject", "draw"];
    expect(replay({ draws: [] }, 14, commands, handler)).toEqual(
      replay({ draws: [] }, 14, commands, handler),
    );
  });
});
