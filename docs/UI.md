# UI and interaction

`src/components/ui/controls.tsx` owns reusable controls and screen surfaces; `src/style.css` owns the palette and layout. Use native controls, accessible names and visible keyboard focus. Give actions clear feedback and keep information needed for a decision available at the point of action.

Collection uses paginated grids of player and enemy cards. Hover or keyboard focus reveals details; clicking a Collection card does not select it. Arrow keys move among visible controls, Tab follows normal focus order, and Back/Escape follow navigation history. Undiscovered entries are masked. A route's visible card pair and enemy preview count as discoveries even when the player takes another path; hidden future encounters remain masked. Battle has its own selection and inspection flows; preserve keyboard access, focus recovery and the difference between inspecting and committing a play.

Reward and route screens show current HP with the same contextual antihero and relic inspection as combat. Rest choices preview actual healing after the maximum-HP cap. The Mirror Exchange shows the offered pair alongside the current deck, with a way back before committing a trade. When the run changes phase, the view returns to the top so compact screens start at the new decision rather than a prior scroll position.

`src/components/ui/tooltip.tsx` positions inspection in root space and handles viewport edges and dismissal. The display scale in `src/lib/display/scale.ts` uses the 1280 × 720 fit and large-window growth curve, with a separately saved Game Size. Tooltip Size is independent. Fullscreen is per session and uses the browser or Electron window API. Settings, including reduced motion and background effects, are stored locally; audio should use the shared manager in `src/lib/settings/settings.ts`. No audio assets are registered yet.

English is the source UI catalog in `src/lib/localization/locales/en.json`; `en-XA` is an expanded-text test catalog, not a translation. Update both catalogs and retain matching interpolation placeholders when editing catalog text, then run `npm run localization:check`. Reviewed card and enemy descriptions also originate in the content pipeline; they are not automatically translated by this check.

## Visual and interaction review

For visible changes, compare the original and candidate in the renderer using the same viewport, state and settings. Inspect the full composition as well as the changed element, then exercise affected pointer and keyboard interactions, focus and dismissal. Check relevant small and large viewport sizes, scaling, reduced motion and expanded text where affected. Review art in its destination at the intended size and crop. Preserve useful existing behavior and favor clear, restrained presentation over extra decoration.

Record the revision, viewport, locale, settings and steps or seed needed to reach the state so the comparison can be repeated. Identify the visible or interaction problem, preserve existing strengths, and consider removing visual weight before adding more. A larger image, new badge or different arrangement should earn its place in the full screen; keep the existing design if a candidate does not improve it. Include the states before and after an action, not only the settled screen, when feedback or focus is affected.

Screenshots help inspect layout; tests protect the behaviors they exercise. Neither substitutes for the other, and a static capture cannot verify motion timing. If a renderer or interaction cannot be checked, report that limitation. Keep temporary captures and browser data out of committed source; do not interrupt another task's server or browser.
