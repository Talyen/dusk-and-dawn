# Seeded playthroughs and replay

The existing automated playthroughs exercise the real run command path. They are bounded heuristic experiments and regression checks, not autonomous player models or a measure of human difficulty. The [expedition playtest](Expedition%20Playtest%20v0.1.md) records historical results; rerun the relevant experiment at the revision being evaluated before using its numbers for a new decision.

## Existing coverage

| Owner                                                      | Scenario and evidence                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/lib/playthrough.test.ts`                            | One fixed-priority policy runs 100 seeds for at most 300 commands each. It checks accepted commands, HP and hand bounds, accounts for unfinished runs, and expects at least one victory.                                                                                                                                           |
| `tests/lib/strategy-playtests.test.ts`                     | Four policies each run 100 seeds; route/relic/orientation combinations each run 50; a 2×2 orientation and Cracked Vessel comparison runs 100 per combination for each of two policies. Each run is bounded at 400 commands. The tests check accepted commands, hand size and outcome accounting, and print aggregate observations. |
| `src/lib/game/headless.ts` and `tests/lib/session.test.ts` | `replay` applies an explicit command sequence through a session and returns decisions and a snapshot. Session tests cover deterministic replay and rollback; this is a programmatic helper, not a command-line simulator.                                                                                                          |
| `tests/e2e/browser.spec.ts`                                | Includes seeded full-run and branching-expedition journeys through the renderer. These cover different risks from a headless policy.                                                                                                                                                                                               |

The initial antihero comparison uses the same attack and defense heuristics for 30 seeds each (0–29), with a 400-command cap and no expedition options. At base `7bf222c` plus the antihero changes, the final kits and reward pools produced 30 victories and no unfinished runs in each sample. Mean victory HP was 24.3/28.5 for Seraph, 21.5/26.3 for Witch, and 21.2/26.2 for Oracle (attack/defense respectively); total turns were 255/309, 334/438, and 374/501. These policies do not understand every passive or predict human decisions; the results show neither that the classes are equally difficult nor that the game is balanced. Earlier Witch trials with a different kit and Poison 1 won 21/30 attack runs; changing both its kit and passive prevents attributing the difference to either change alone.

The strategy policies score selected patterns in printed effects, rather than understanding every mechanic; the random policy uses a separate seeded stream. They choose rewards, pending choices and targets according to their own rules. Read the test before drawing conclusions or extending the scenarios. Their printed victory HP means include only victories; `turns` and `plays` are totals over the sample. The factorial experiment also reports opening HP for runs reaching its first reward and the most-played faces. An unfinished count is a separate outcome, not a loss or win. The basic playthrough's `minimumVictoryHp` is not meaningful when there are no victories.

## Run and compare

Choose a relevant experiment and run it with one worker, for example:

```sh
npx vitest run --maxWorkers=1 tests/lib/playthrough.test.ts
npx vitest run --maxWorkers=1 tests/lib/strategy-playtests.test.ts -t "compares experimental routes"
```

These tests run many simulations and can be slow; use a focused experiment when it answers the question and follow [local verification policy](../CONTRIBUTING.md). Their fixed sample sizes and command bounds live in the tests, not command-line flags. Do not silently reduce them to make a comparison pass.

Record the commit, any uncommitted changes, test and policy, seed range, configuration, command limit, sample size, unfinished count and relevant output. Compare the same scenario and policy before and after a change. Matching starting seeds do not ensure identical later draws when decisions or random consumption diverge. A victory-only mean can change because the set of winners changed; keep its denominator and unfinished outcomes visible. Examine representative command sequences and state transitions when an aggregate suggests a problem.

The assertions do not set balance targets or prove every effect, encounter, route, save/resume boundary or UI interaction works. A passing experiment can still print undesirable outcomes. Use focused outcome and save tests for specific rules, rendered play for interaction, and human playtesting for comprehension, enjoyment and difficulty. Report missing or inconclusive evidence instead of treating an automated win rate as a release decision.
