import { createAudioManager } from "../audio/audio";

export interface Settings {
  music: number;
  sound: number;
  reducedMotion: boolean;
}

export const defaultSettings: Settings = { music: 1, sound: 1, reducedMotion: false };
export const audio = createAudioManager();
const key = "dusk-and-dawn.settings.v1";

export function readSettings(): Settings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!value || typeof value !== "object") return { ...defaultSettings };
    const candidate = value as Partial<Settings>;
    const validVolume = (volume: unknown): volume is number =>
      typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 1;
    return {
      music: validVolume(candidate.music) ? candidate.music : defaultSettings.music,
      sound: validVolume(candidate.sound) ? candidate.sound : defaultSettings.sound,
      reducedMotion:
        typeof candidate.reducedMotion === "boolean"
          ? candidate.reducedMotion
          : defaultSettings.reducedMotion,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function applySettings(settings: Settings) {
  audio.setVolume("music", settings.music);
  audio.setVolume("sound", settings.sound);
  document.documentElement.dataset.reducedMotion = String(settings.reducedMotion);
}

export function saveSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
