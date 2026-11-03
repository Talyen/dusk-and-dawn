> Historical integration handoff for the first full review. The current [Bless/Curse and control review](Bless%20Curse%20and%20Control%20Review%20v0.1.html) and [status revision](Status%20and%20Targeting%20Revision%20v0.1.html) supersedes the earlier Ward/Burn/Scry/Keep/Flip rules and validation count quoted below. Current counts are in Content Validation v0.1.json.

# Content review handoff

The revised design, card catalogue and enemy catalogue are complete in this project worktree on `codex/enemy-art-mechanics-20261103`. They remain design proposals; no combat runtime or human playtest is claimed.

- All 496 card faces and 110 enemies have individual artwork-based judgments. All 606 source images were inspected in 41 contact sheets; this is a thematic review at thumbnail scale, not full-resolution visual QA.
- 215 card descriptions changed. The 110 enemies now have 243 independent actions, one labeled trait and one explicit typed weakness each.
- Separate theme tags are removed. Structured keywords and colors derive from the actual effect description. Ordinary instructions stay plain language. Binding and Release remain provisional damage names; no replacement or opposition taxonomy was invented.
- Hush suppresses the labeled trait immediately through the next action, skips non-attack abilities, preserves base attacks and advances the pattern. All 110 enemies have a Hush window, with explicit previews. Swan and Librarian are the only two reactive traits.
- Leech uses final damage after bonuses and Weaken, before Ward, including overkill, capped by maximum HP. Four feeding-themed card faces use it; fixed food/medicine heals were not converted.
- Ward appears in 42 current card descriptions, down from 93; 28 grant Ward, down from 65. It appears in 22 enemies' actual mechanics, down from 52. The earlier 59-enemy whole-entry count included incidental advice and is not the comparable baseline.
- No current effect tests Ward-versus-HP damage, actual HP lost, prior-turn identity or retained-card snapshots. Conditional Burn feeding is checked once for the whole trait; scheduled hand/draw/mana effects use visible temporary counters.

The HTML catalogues, canonical JSON, plain-text enemy catalogue, keyword rules, coverage manifests, full review and validation report are all in `docs/`. `scripts/content-review/` holds the 606 review recipes and reproducible generators/checks. Existing illustrations and historical review notes are preserved. Temporary source output remains in ignored `test-results/` inside this worktree; earlier Documents files were left intact.

## Verification and limits

`python3 scripts/content-review/render.py` regenerates all canonical documents. It was verified to produce byte-for-byte identical output without the ignored baseline snapshot. `python3 scripts/content-review/validate.py` passes 2,105 focused checks, including all 606 source-artwork hashes, 41 contact-sheet hashes and 110 decoded embedded enemy thumbnails. Generated search/filter JavaScript passes Node syntax checks. `git diff --check` is clean.

These checks cover consistency and arithmetic boundaries, not a full combat model. Healing, Hush/Weaken/Reflect combinations, Banish thinning, sparse weaknesses and later-encounter disruption still need simulation and player testing. Memory has no direct player attacks and no assigned enemy weakness; Growth has two direct faces, Flame one, Frost three and Oblivion one. The catalogue flags wider-pool and sparse weaknesses.

Local-file browser preview was denied by the browser's policy permitting only HTTP(S). No alternate browser, local server or other workaround was attempted. Browser rendering, filter interaction and full visual layout remain unverified.

## Main-project reconciliation

Target: `/Users/ryanmcintire/Developer/Dusk & Dawn`.

Main's existing three modified documents and sixteen untracked document/artwork files were checked against the exact captured review baseline. No newer edits or unrelated changes were present. All 19 files were preserved byte-for-byte in local checkpoint commit `d5bd86add7c3e4bc76b9871c6f4d4edb7fd9ebe7` before reconciliation. No dirty file was overwritten or discarded.

That checkpoint was merged into this task branch. The nine expected document conflicts were resolved to the reviewed versions from `943399a28fff3c98ea91a1bb4d9d936ed828fe64`, which were authored from that same baseline. All 496 card identities, artwork links, sides, costs and source metadata are preserved; all 110 enemy identities, observed-artwork records, source hashes and explicit weakness definitions are preserved. The two historical review notes retain main's entire original text after an archival notice. The ten contact sheets merged unchanged. The original documents remain recoverable from the checkpoint commit; the new recipes and review records retain each prior effect and its replacement rationale.

The reconciled document tree matched the already-verified review tree before this handoff update. AGENTS.md and all application files are unchanged. The final committed tree must be validated before integration using the required shared-lock command, `node scripts/integrate.mjs <main-worktree> <verified-full-commit>`. Both worktrees must remain clean and the verified commit must include current main. No push or publication is authorized or performed.
