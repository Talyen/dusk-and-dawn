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

## Dependency audit

The current npm audit reports moderate advisories in the development-only Electron packaging dependency tree, rooted in older `minimatch` versions. The production dependency audit reports no advisories. Recheck after electron-builder updates; do not use `npm audit fix --force` to downgrade the packaging toolchain without verifying both desktop targets.

## UI foundation

`src/components/ui/controls.tsx` contains reusable buttons, surfaces, a switch,
a named progress bar, pressed-button tab navigation, and the screen shell. The semantic palette in `src/style.css`
and these controls adapt Alchemy's UI foundations to Dusk & Dawn's dusk palette.
Use native controls and visible focus states; interactive artwork can use
`SurfaceButton`. Options stores music and sound volumes and reduced-motion
preference locally. Audio playback should use the shared `audio` manager exported
from `src/lib/settings/settings.ts` so these volume settings apply. No sound assets
are configured yet. Settings storage is separate from game saves.

The UI palette, controls, and interaction conventions are adapted from Alchemy's
`src/styles/theme.css`, `src/components/ui/`, `src/features/alchemy/shared/ui/`,
and `Docs/UI.md` (Alchemy source is CC BY-NC 4.0); Dusk & Dawn's own license has
not been specified here.

## Card and display foundations

Collection demonstrates image-led player (3:4) and enemy (4:3) cards with
blank placeholder art and copy. `src/components/cards/card.tsx`
accepts artwork and description data, and supplies hover and keyboard focus
feedback, shimmer, and a root-space tooltip. Tooltip placement flips and
shifts at viewport edges; Escape, scrolling, an outside press, and window blur
dismiss inspection. Cards do not implement combat, hand layout, keyword effects,
or inspection overlays yet.

Game Size is saved on this device from 80% to 120% in 5% steps. The interface
uses Alchemy's 1280 × 720 fit and 72% large-window growth curve, normalized to
Dusk & Dawn's existing authored sizes; it responds to viewport changes. This
includes tooltips, which scale once in root space. Source patterns are adapted
from Alchemy's card, tooltip, and virtual-resolution UI (CC BY-NC 4.0).

## Browsing and display

Collection contains placeholder player and enemy entries in adaptive,
paginated grids. Hover or keyboard focus reveals card details; clicking a card
has no inspection or selection action. Arrow keys move among visible controls,
Tab follows the normal focus order, and Back/Escape return through screen history.
A focused card is retained when grid capacity changes where possible. Card titles
and descriptions appear in tooltips, with no captions beneath the artwork.
Collection and Options use a shared header with Back and a game menu. The menu
links between those screens and Main Menu; Back follows browsing history and
Collection retains its tab and page during the visit.

Tooltip Size is stored locally (90–125%, in 5% steps) independently of Game
Size. Fullscreen is a per-session display control: the browser uses its native
fullscreen API, and Electron uses the native window (simple fullscreen on macOS).
Options groups settings under Display and Sound tabs. A failed mode change is reported in Options. Screen fades follow the existing
reduced-motion preference. UI sound cue hooks are ready for approved assets; no
sounds are registered or included yet. The browsing and navigation patterns are
adapted from Alchemy's shared UI (CC BY-NC 4.0).

## Collection and keyword presentation

The current Collection is a sample, not player progression. Its catalog and
sample discovered IDs live in `src/lib/collection/catalog.ts`; the browser
accepts a catalog and a set of discovered IDs. Undiscovered entries mask their
art, title, and description. When gameplay establishes discovery, pass its
canonical discovered IDs to the browser and replace the sample catalog; no
placeholder discoveries are written to game saves or local storage.

`src/lib/keywords/keywords.ts` owns keyword IDs, localized label keys, and color
pairs. The current sample definitions and colors are temporary. Card descriptions
highlight complete keyword labels, while hover/focus borders, ambient plasma,
and particles derive their colors from the same definitions. Entries without
resolved keywords use neutral shine. Add localized labels with actual keywords
when the game design is ready.

The background plasma and particle renderers in `src/lib/animation/` adapt
Alchemy's WebGL and canvas lifecycle code (CC BY-NC 4.0). Plasma falls back to a
static gradient on WebGL failure or context loss; reduced motion uses a static
glow and hides particles. Background Glow and Background Particles can be
adjusted independently in Options, including turning either off.

## Design documents

The reviewed design lives in `docs/Dusk & Dawn — Game Design v0.2.html`, with linked card and enemy catalogues. `docs/Full Content Review v0.1.html` records all 496 face and 110 enemy judgments. These are design proposals; the app still has no playable combat implementation.

Descriptions contain the complete card effects. Structured `keywords` come only from words actually used in those descriptions; there are no separate theme tags. Enemy actions use independent values and include explicit Hush previews. `docs/Effect Rules v0.1.json` records the shared rule contract. Binding and Release remain provisional damage names.

Regenerate and validate the documents using Python 3 with Pillow installed:

```sh
python3 scripts/content-review/render.py
python3 scripts/content-review/validate.py
```

The versioned recipes contain one thematic rationale per artwork. Rebuilding preserves the embedded enemy thumbnails. Artwork hash checks require the original local Google Drive artwork folders recorded in the coverage manifests. To refresh the contact sheets from those masters, run `python3 scripts/content-review/prepare.py` before the renderer and validator. The 41 project-local contact sheets remain readable without that source folder.

The validation report checks document/data consistency and arithmetic boundary cases. It does not establish combat balance or player enjoyment. Local-file browser preview was denied by policy, so browser rendering and filter interaction remain unverified.
