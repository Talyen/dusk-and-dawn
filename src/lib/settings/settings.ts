import { createAudioManager } from "../audio/audio";

export interface Settings {
  music: number;
  sound: number;
  reducedMotion: boolean;
  gameSizePercent: number;
  tooltipSizePercent: number;
}

export const defaultSettings: Settings = {
  music: 1,
  sound: 1,
  reducedMotion: false,
  gameSizePercent: 100,
  tooltipSizePercent: 100,
};
export const audio = createAudioManager();
const key = "dusk-and-dawn.settings.v1";

export function readSettings(): Settings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (!value || typeof value !== "object") return { ...defaultSettings };
    const candidate = value as Partial<Settings>;
    const validVolume = (volume: unknown): volume is number =>
      typeof volume === "number" && Number.isFinite(volume) && volume >= 0 && volume <= 1;
    const gameSizePercent =
      typeof candidate.gameSizePercent === "number" && Number.isFinite(candidate.gameSizePercent)
        ? Math.max(80, Math.min(120, Math.round(candidate.gameSizePercent / 5) * 5))
        : defaultSettings.gameSizePercent;
    const tooltipSizePercent =
      typeof candidate.tooltipSizePercent === "number" && Number.isFinite(candidate.tooltipSizePercent)
        ? Math.max(90, Math.min(125, Math.round(candidate.tooltipSizePercent / 5) * 5))
        : defaultSettings.tooltipSizePercent;
    return {
      gameSizePercent,
      tooltipSizePercent,
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
  document.documentElement.style.setProperty("--tooltip-size", String(settings.tooltipSizePercent / 100));
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
