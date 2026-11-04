# Architecture and persistence

This map describes the prototype as implemented. The [design index](README.md) distinguishes design proposals from runtime behavior. Source and tests own executable details.

## Ownership

| Area                                    | Owners                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Application screens and settings        | `src/App.tsx`, `src/lib/navigation/`, `src/lib/settings/`                                                                                   |
| Battle presentation and save scheduling | `src/components/game/battle.tsx`                                                                                                            |
| Command session and replay              | `src/lib/game/session.ts`, `random-state.ts`, `headless.ts`                                                                                 |
| Run phases and commands                 | `src/lib/game/run.ts`; card zones, damage and statuses in adjacent modules                                                                  |
| Reviewed content                        | `src/lib/game/simple-*.generated.ts` plus explicit card definitions and handling in `run.ts`; see [content workflows](CONTENT_WORKFLOWS.md) |
| Run encoding and storage                | `src/lib/game/run-save.ts`, `src/lib/save/save.ts`, `desktop/save.cjs`                                                                      |
| Collection and expedition progress      | `src/lib/collection/`, `src/lib/game/progression.ts`                                                                                        |
| UI controls, cards and tooltips         | `src/components/ui/`, `src/components/cards/`, `src/components/browsing/`; see [UI](UI.md)                                                  |

## Commands and randomness

A session holds a JSON-compatible state, revision and serializable random state. `dispatch` runs a handler against an Immer draft and a draft RNG. An accepted decision publishes the resulting snapshot and increments the revision; rejection discards both state changes and random draws. A handler exception also prevents publication. Subscribers observe committed snapshots, and a subscriber failure is logged without undoing the commit. Keep gameplay changes in the command path rather than mutating snapshots from presentation code. `headless.ts` replays commands through that same session; reproducibility depends on the same initial state, seed and command sequence.

The run includes battle, reward, rest, route, victory and defeat phases. Expedition configuration and pending paid inspection choices are part of run state. The design's reference model in `scripts/content-review/status_model.py` is separate from the game engine; passing its arithmetic checks does not establish runtime equivalence.

## Saves and recovery

The version 1 envelope stores revision, RNG value and JSON state. `run-save.ts` validates a versioned run payload and semantic constraints, then tries the primary candidate followed by the retained copy. It reports recovery when a later candidate is used; invalid candidates do not silently become a new run. The battle screen reports load and write failures and warns that starting a new run replaces the saved run. Accepted snapshots are queued for persistence; after recovery, the first successful write preserves the retained copy.

The browser backend uses `dusk-and-dawn.save.v1` and its `.backup` key in local storage. Electron exposes fixed read/write operations through its preload bridge; `desktop/save.cjs` serializes writes, validates the envelope, and uses temporary files and rename for `save.json` and `save.backup.json` under the app's user-data `saves` directory. The browser and desktop backends have different failure modes; neither is a cloud save.

Settings, Collection discoveries and expedition progression use separate local-storage keys. They are not part of the run envelope or its backup. A storage failure can leave play available without durable progress; inspect the owning code and UI feedback for the particular record.

For investigation, the other keys are `dusk-and-dawn.settings.v1`, `dusk-and-dawn.collection.v1` and `dusk-and-dawn.expeditions.v1`. Browser storage belongs to its origin and profile; Electron's run save uses its user-data directory, while these other records use renderer local storage. Preserve existing data when reproducing a problem: use an isolated browser profile or a temporary Electron user-data directory, and retain both run-save candidates as evidence before trying recovery. Clearing site data or starting a new run can destroy evidence and progress.

The antihero field is optional in version 1: current builds accept earlier classless runs unchanged. Hero ruleset 2 is stored with new runs; Witch saves without it retain their original Poison passive, and starting-deck changes affect new runs only. Event variants and the previous route's event are optional fields: an older saved route without them keeps its original 4 HP cost. Older builds have a strict schema and cannot resume newer saves containing fields they do not recognize; avoid opening new class runs, new relic runs, or runs with generated event variants in an older build.

Before changing saved fields, identifiers, encounter definitions or validation, consider old primary and backup data, in-progress phases, pending choices, RNG continuity and recovery on both backends. The current schema is strict and no general migration framework is documented or implemented here. Design compatibility or an explicit migration and test representative old saves before changing the format; do not assume a version bump alone preserves them. Relevant coverage includes `tests/lib/run-save.test.ts`, `save.test.ts`, `save-storage.test.ts`, `session.test.ts` and the browser and desktop resume tests.
