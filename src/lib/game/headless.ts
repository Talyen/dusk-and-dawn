import { createSession, type Handler, type Snapshot, type Decision } from "./session";

export interface ReplayResult<S, E> {
  snapshot: Snapshot<S>;
  decisions: Decision<E>[];
}
/** The UI and simulations use the same handler and command path. */
export function replay<S, C, E>(
  initial: S,
  seed: number,
  commands: readonly C[],
  handler: Handler<S, C, E>,
): ReplayResult<S, E> {
  const session = createSession(initial, seed, handler);
  const decisions = commands.map((command) => session.dispatch(command).decision);
  return { snapshot: session.getSnapshot(), decisions };
}
