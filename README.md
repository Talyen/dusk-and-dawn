# Dusk & Dawn

A browser and desktop card game prototype foundation. There are no game rules or playable battles yet.

## Get started

Use Node.js 24.18+ within 24.x and npm 11.x:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run dev:desktop` opens the same app in Electron on port 5173.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run assets:check
npm run localization:check
npx playwright install chromium
npm run test:browser
npm run build
npm run test:desktop
```

The desktop test loads the built renderer, so build first. `npm run format` formats source. Playwright starts its own development server and requires port 5173 to be free. GitHub Actions runs these checks and tests Electron on macOS and Windows; the manual package workflow retains unsigned development packages.

## Architecture

`src/lib/game` provides a React-free command session, serializable random state, and deterministic headless replay. State must be JSON-compatible; rejected or failing commands do not publish state or consume randomness. The handler and the UI will be supplied by the future game design. `src/lib/save` defines a versioned envelope and browser/desktop backends; Electron exposes only fixed save operations with an isolated renderer, atomic file replacement, and a previous-copy recovery candidate. Saves are not yet connected to gameplay.

English is the source catalog in `src/lib/localization/locales`; `en-XA` is an expanded-text test locale, not a translation. The check verifies keys and interpolation placeholders. Audio and opt-in diagnostics utilities are present but no audio assets, reporting provider, network reporting, or telemetry are configured.

## Assets

`assets/manifest.json` lists approved image masters as `{ "source": "relative/path.png", "output": "name.webp", "width": 512, "quality": 80 }`. Set `ASSET_LIBRARY_ROOT` to the source library and run `npm run assets:prepare` to generate selected WebP files and a hash receipt. Commit the prepared outputs and receipt. `npm run assets:check` validates the manifest and committed output hashes without requiring the source library. The manifest is currently empty. Record each source's ownership and usage rights alongside the selection before adding art.

## Desktop packages

`npm run dist:mac` builds an unsigned macOS DMG on a Mac. `npm run dist:win` builds a Windows x64 NSIS installer; cross-building can require additional platform tooling. Outputs are in `release/`. Signing, notarization, Steam, cloud saves, public release, and deployment are not configured. The manual GitHub workflow packages artifacts but does not publish them.

## Worktrees and integration

Follow [AGENTS.md](AGENTS.md). From a clean task worktree whose exact commit has been verified, run `node scripts/integrate.mjs <path-to-main-worktree> <full-verified-commit>`. The command uses the repository's shared lock, refuses dirty checkouts or a stale base, and fast-forwards main. It does not push.

## Provenance

The seeded generator, integer selection, and shuffle in `src/lib/random.ts` are adapted from Alchemy's `src/lib/rng/index.ts`, with the rights holder's authorization for reuse in this project. Alchemy's repository identifies its own source as CC BY-NC 4.0; no project-wide license for Dusk & Dawn is specified here.
