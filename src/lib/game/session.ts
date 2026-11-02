import { current, freeze, isDraft, produce, type Draft } from "immer";
import { z } from "zod";
import { createStore, type StoreApi } from "zustand/vanilla";
import { randomState, stateRng, type RandomState } from "./random-state";
import type { Rng } from "../random";

export interface Snapshot<S> {
  revision: number;
  state: S;
  random: RandomState;
}
export type Decision<E> = { accepted: true; effects: E[] } | { accepted: false; reason: string };
export type Handler<S, C, E> = (draft: Draft<S>, command: C, rng: Rng) => Decision<E>;
export type DispatchResult<S, E> = { decision: Decision<E>; snapshot: Snapshot<S> };

/** A rejected command discards both the state draft and all random draws. */
export function createSession<S, C, E>(initial: S, seed: number, handler: Handler<S, C, E>) {
  return restoreSession({ revision: 0, state: initial, random: randomState(seed) }, handler);
}

export function restoreSession<S, C, E>(saved: Snapshot<S>, handler: Handler<S, C, E>) {
  if (
    !Number.isSafeInteger(saved.revision) ||
    saved.revision < 0 ||
    !Number.isInteger(saved.random.value) ||
    saved.random.value < 0 ||
    saved.random.value > 0xffffffff
  )
    throw new Error("Invalid snapshot");
  const detached = structuredClone(saved);
  detached.state = z.json().parse(detached.state) as S;
  let snapshot = freeze(detached, true) as Snapshot<S>;
  const store: StoreApi<{ snapshot: Snapshot<S> }> = createStore(() => ({ snapshot }));
  function dispatch(command: C): DispatchResult<S, E> {
    let decision: Decision<E> | undefined;
    let resultSnapshot = snapshot;
    const rejection = Symbol("rejected command");
    try {
      const next = produce(snapshot, (draft) => {
        decision = structuredClone(
          handler(draft.state as Draft<S>, structuredClone(command), stateRng(draft.random)),
        );
        if (
          !decision ||
          typeof decision.accepted !== "boolean" ||
          (decision.accepted ? !Array.isArray(decision.effects) : typeof decision.reason !== "string")
        )
          throw new Error("Invalid command decision");
        if (!decision.accepted) throw rejection;
        z.json().parse(isDraft(draft.state) ? current(draft.state as Draft<object>) : draft.state);
        draft.revision += 1;
      });
      snapshot = next;
      resultSnapshot = next;
      store.setState({ snapshot });
    } catch (error) {
      if (error !== rejection) throw error;
    }
    if (!decision) throw new Error("Command returned no decision");
    return { decision, snapshot: resultSnapshot };
  }
  const subscribe: StoreApi<{ snapshot: Snapshot<S> }>["subscribe"] = (listener) =>
    store.subscribe((state, previous) => {
      try {
        listener(state, previous);
      } catch (error) {
        console.error("Game session subscriber failed", error);
      }
    });
  return { getSnapshot: () => snapshot, subscribe, dispatch };
}
