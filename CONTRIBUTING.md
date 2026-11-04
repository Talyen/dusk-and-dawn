# Contributing

Install dependencies with `npm ci` using the versions in `package.json`. Follow [AGENTS.md](AGENTS.md) for task isolation and integration. Keep local verification focused; CI owns broader checks and desktop packaging. Report the exact evidence and any material limitations rather than implying that a focused check proves the whole game.

## Choose verification for the change

| Change              | Useful focused evidence                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gameplay or content | Run the relevant `tests/lib/*.test.ts` file with `npx vitest run --maxWorkers=1 <file>`; check printed effects against runtime behavior and relevant boundaries.                                           |
| Save or recovery    | Use the relevant `save`, `save-storage`, `run-save`, or session tests; consider both primary and retained copies and pending choices.                                                                      |
| UI or interactions  | Review the affected screen and interaction in the renderer; use a focused component or browser test where it protects a consequential behavior. See [UI review](docs/UI.md#visual-and-interaction-review). |
| Localization        | Run `npm run localization:check`; inspect affected text in its actual layout.                                                                                                                              |
| Prepared artwork    | Run `npm run assets:check` and inspect the artwork in its destination at the intended crop and size.                                                                                                       |
| Documentation       | Check paths, links and commands against their owners; run `git diff --check` and a focused formatting check.                                                                                               |

Choose tests for the failure they can catch, not the number of tests. Prefer an existing focused test or the least expensive layer that exercises the risk. A test that repeats implementation details or duplicates existing protection may add little value. Automated checks do not establish visual quality, balance, or human enjoyment.

For a changed Markdown file, the installed formatter can be run as `npx prettier --check <file>`. `npm run format` writes across the repository; use a path-specific Prettier command when only selected files should change. `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build`, `npm run test:browser`, and `npm run test:desktop` are broader checks. The desktop test loads the built renderer, so build first. Playwright requires Chromium and starts its own server on port 5173; it does not reuse an existing server. Do not stop another task's server to free the port.

[CI](.github/workflows/ci.yml) runs formatting, lint, typecheck, unit tests, build, asset and localization checks, and Chromium tests on Linux; it also builds and runs desktop tests on macOS and Windows. The separately dispatched [package workflow](.github/workflows/package.yml) builds development packages and smoke-tests their executables. A local check is not evidence that those workflows ran. Neither a check nor integration authorizes a push or publication.

## Documentation maintenance

Keep durable guidance near its owner and link to it instead of duplicating rules. When behavior, scripts, generated data, or dependencies change, follow the affected workflow from its entry point and compare claims, prerequisites, paths, and links with the implementation. Label dated reviews and experiments as historical; do not rewrite their evidence as a current guarantee. Verify changed commands safely, and record untested steps or missing source material. See the [design index](docs/README.md) for the distinction between proposals and runtime behavior.

## Integration

In the task worktree, incorporate current committed main, resolve understood conflicts, commit, and verify the exact combined commit. From that clean worktree run `node scripts/integrate.mjs <main-worktree> <verified-full-commit>`. The script acquires the shared lock, checks clean worktrees and ancestry, and fast-forwards main; it does not push. If main advances, incorporate it and verify the new combined commit before retrying. Preserve dirty or ambiguous work and locks as directed by [AGENTS.md](AGENTS.md).
