import { audio } from "../settings/settings";

export type UiCue = "activate" | "change" | "confirm";
let cues: Partial<Record<UiCue, string>> = {};

/** Register approved sound assets when the project has them. Feedback stays usable in silence. */
export function configureUiSounds(next: Partial<Record<UiCue, string>>) {
  cues = { ...next };
}
export function playUiCue(cue: UiCue) {
  const url = cues[cue];
  if (url) void audio.play(url, "sound").catch(() => undefined);
}
