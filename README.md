# Dusk & Dawn

A browser and desktop card game prototype foundation. The placeholder screen does not yet define gameplay.

## Get started

Use Node.js 24.18+ within 24.x and npm 11.x, then run:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Run `npm run dev:desktop` to open the same app in Electron. The desktop development server uses port 5173.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run test:desktop
```

The desktop smoke test loads the built renderer, so run `npm run build` first. `npm run format` formats the source. Playwright tests start their own development server and require port 5173 to be free.

## Desktop packages

`npm run dist:mac` builds an unsigned macOS DMG on a Mac. `npm run dist:win` builds a Windows x64 NSIS installer; cross-building can require additional platform tooling. Outputs are written to `release/`. These are development artifacts, not signed or notarized releases.

## Structure and provenance

`src/lib/` contains framework-independent logic; React presentation lives in `src/`, and `desktop/` owns the Electron process. No native APIs are exposed to the renderer.

The seeded generator, integer selection, and shuffle in `src/lib/random.ts` are adapted from Alchemy's `src/lib/rng/index.ts`, with the rights holder's authorization for reuse in this project. Alchemy's repository identifies its own source as CC BY-NC 4.0; no project-wide license for Dusk & Dawn is specified here.
