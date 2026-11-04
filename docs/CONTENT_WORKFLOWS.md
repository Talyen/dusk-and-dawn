# Content and asset workflows

The reviewed design catalogues describe intended content; runtime behavior is implemented separately. The [design index](README.md) identifies later revisions and historical evidence. Before changing an effect, decide whether the task changes the proposal, the game, or both; keep printed descriptions, runtime behavior and relevant tests in agreement.

## Change reviewed content

1. Trace the entry through the card or enemy catalogue JSON, `scripts/content-review/` recipes and generation code. Card review text is in `cards-review.tsv`; enemy and flow recipes are in the neighboring TSVs and Python modules. `render.py` regenerates multiple design HTML and JSON files, including the catalogues, and can overwrite direct edits to generated descriptions. Read the generator before editing and review its complete diff.
2. Trace the corresponding runtime entry. `scripts/generate-simple-cards.mjs` parses supported descriptions into operations; unsupported pairs are omitted. `run.ts` also defines and handles explicit cards, some of which override generated entries. Enemy generation maps supported catalogue operations into `simple-enemies.generated.ts`; unsupported encounters are omitted. Adding wording or an operation to a catalogue does not by itself implement it. Update the parser, handler, previews and deliberate choice flows as needed.
3. Generate affected runtime data from the repository root, with the selected original artwork library available:

   ```sh
   export ASSET_LIBRARY_ROOT="/path/to/Dusk & Dawn"
   node scripts/generate-simple-cards.mjs
   node scripts/generate-simple-enemies.mjs
   node scripts/generate-collection-index.mjs
   ```

   The first two generators verify recorded source artwork hashes and can update `assets/manifest.json` as well as generated TypeScript. The collection index generator reads both catalogues. Run only the relevant generators, inspect their output and counts, and do not hand-edit generated TypeScript. If the original library or hash records are unavailable, report that limitation rather than substituting unverified artwork.

4. Check identity, printed effect, actual outcome and edge cases at the appropriate layer. For example, `tests/lib/catalogue-conservation.test.ts`, `catalogue-outcomes.test.ts`, card outcome family tests and enemy mapping tests protect different aspects. Review battle previews, Collection, saved-run compatibility and keyboard choices when affected. Content coverage is summarized in [Card Outcome Audit](Card%20Outcome%20Audit%20v0.1.md), with explicit limits.

For the design documents, `python3 scripts/content-review/render.py` writes generated files and `python3 scripts/content-review/validate.py` performs consistency and arithmetic checks **and writes** `docs/Content Validation v0.1.json`. Both require Python and Pillow; validation also reads the original artwork folders at the local paths in its source, checks their hashes and checks the committed contact sheets. `prepare.py` regenerates the card contact sheets and inventory from a hard-coded local artwork folder and macOS fonts; it is not a prerequisite for ordinary runtime changes. These tools have fixed catalogue counts and assumptions: inspect and update their contracts deliberately when changing the inventory. Their checks do not establish balance, human enjoyment, full-resolution art quality or rendered HTML behavior.

## Prepare artwork

`assets/manifest.json` explicitly selects library-relative source paths, output filenames, width and quality. To prepare those selections, set `ASSET_LIBRARY_ROOT` to the source library and run `npm run assets:prepare`. It writes WebP images under `public/assets/` and `assets/receipt.json`; review and commit the intended outputs, manifest and receipt together. Preparation reads and transforms all selected sources before publishing outputs, but a filesystem failure during publication can leave a partial update. Inspect and rerun after correcting the failure.

`npm run assets:check` validates the manifest fingerprint and committed output hashes against the receipt without the source library. It does **not** compare current source bytes with the receipt, prove visual quality, or check distribution rights. Review the destination crop and dimensions, and record source and authorized usage in [provenance](../assets/PROVENANCE.md) when adding material. Do not infer broader rights from project-use authorization.

## Localization and audio

The UI catalogs and placeholder check are described in [UI](UI.md). The generated card and enemy copy is currently English content; adding a locale requires a deliberate content and UI translation workflow, not just a new catalog file. `src/lib/audio/audio.ts` supplies audio infrastructure and settings integration, but no audio assets are registered. Establish provenance and review actual playback before treating audio as release-ready.
