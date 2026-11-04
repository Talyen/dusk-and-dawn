# Dusk & Dawn

A browser and desktop card game prototype. The playable run contains five scheduled encounters, reviewed two-sided cards and enemies, local saves, and an optional branching expedition. Balance and several design decisions remain provisional; see the [playtest notes](docs/Expedition%20Playtest%20v0.1.md).

## Get started

Use Node.js 24.18+ within 24.x and npm 11.x:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run dev:desktop` opens the app in Electron. Both use port 5173.

## Documentation

- [Contributing and verification](CONTRIBUTING.md): focused checks, CI, visual review, and local integration.
- [Architecture and persistence](docs/ARCHITECTURE.md): ownership, command and random-state boundaries, saves, and recovery.
- [Content and asset workflows](docs/CONTENT_WORKFLOWS.md): design sources, generated runtime data, artwork, and localization.
- [UI and interaction](docs/UI.md): shared controls, navigation, inspection, scaling, and review.
- [Design and review index](docs/README.md): current design inputs, historical records, and their limitations.

`package.json` owns the complete command list. Follow [AGENTS.md](AGENTS.md) for worktree isolation and the shared local integration lock. Pushes and publication require separate authorization.

## Desktop and release status

The manual GitHub package workflow produces unsigned development packages. `npm run dist:mac` builds a macOS DMG on a Mac; `npm run dist:win` builds a Windows x64 NSIS installer and may require platform tooling when cross-building. Outputs go to `release/`. Signing, notarization, Steam, cloud saves, and public release are not configured. A protected Vercel project exists. Packaging does not publish.

## Provenance

The seeded generator, integer selection, and shuffle in `src/lib/random.ts` are adapted from Alchemy's `src/lib/rng/index.ts`, with the rights holder's authorization for reuse in this project. The UI palette, controls, interaction conventions, and display scaling also adapt Alchemy's `src/styles/theme.css`, `src/components/ui/`, `src/features/alchemy/shared/ui/`, and `Docs/UI.md`. Alchemy identifies its source as CC BY-NC 4.0; no project-wide license for Dusk & Dawn is specified here. Prepared artwork provenance and the scope of its project-use authorization are recorded in [assets/PROVENANCE.md](assets/PROVENANCE.md).
